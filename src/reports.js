const node = (tag, text) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
};

const showReports = async (container, apiBase) => {
  const [products, movements] = await Promise.all(
    ["products", "movements"].map(async (name) => {
      const response = await fetch(`${apiBase}/${name}`);
      if (!response.ok) throw new Error(`API ответил ${response.status}`);
      return response.json();
    }),
  );
  if (!container.isConnected || !window.location.pathname.endsWith("/reports")) return;
  const section = node("section");
  const total = (type) =>
    movements
      .filter((movement) => movement.type === type)
      .reduce((sum, movement) => sum + movement.quantity, 0);
  section.append(
    node("h2", "Движение товаров"),
    node(
      "p",
      `Принято ${total("in")} шт., выдано ${total("out")} шт. Отчёт загружен отдельным чанком, версия приложения ${__APP_VERSION__}.`,
    ),
  );
  if (movements.length === 0) {
    section.append(node("p", "Движений пока нет."));
  } else {
    const table = node("table");
    const head = node("thead");
    const heading = node("tr");
    for (const title of ["Время", "Товар", "Операция", "Количество", "Остаток"])
      heading.append(node("th", title));
    head.append(heading);
    const body = node("tbody");
    const names = new Map(products.map((product) => [product.id, product.name]));
    for (const movement of movements) {
      const row = node("tr");
      for (const value of [
        new Date(movement.at).toLocaleTimeString("ru-RU"),
        names.get(movement.productId),
        movement.type === "in" ? "Приём" : "Выдача",
        movement.quantity,
        movement.stock,
      ])
        row.append(node("td", String(value)));
      body.append(row);
    }
    table.append(head, body);
    section.append(table);
  }
  container.replaceChildren(section);
};

export default showReports;
