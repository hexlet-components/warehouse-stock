import box from "./box.svg";
import "./style.css";

const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};

const movement = (apiBase, product, stockLabel) => {
  const container = node("div", undefined, "movement");
  const label = node("label", "Количество ");
  const quantity = node("input");
  quantity.type = "number";
  quantity.min = "1";
  quantity.value = "1";
  label.append(quantity);
  const incoming = node("button", "Принять");
  const outgoing = node("button", "Выдать");
  incoming.type = outgoing.type = "button";
  const message = node("output");
  const move = async (type) => {
    message.textContent = "";
    incoming.disabled = outgoing.disabled = true;
    try {
      const response = await fetch(`${apiBase}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, type, quantity: Number(quantity.value) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? `API ответил ${response.status}`);
      product.stock = result.stock;
      stockLabel.textContent = `Цена ${product.price} ₽ · на складе ${product.stock} шт.`;
      message.textContent =
        type === "in" ? `Принято ${result.quantity} шт.` : `Выдано ${result.quantity} шт.`;
    } catch (error) {
      message.textContent = error.message;
    } finally {
      incoming.disabled = outgoing.disabled = false;
    }
  };
  incoming.addEventListener("click", () => move("in"));
  outgoing.addEventListener("click", () => move("out"));
  container.append(label, incoming, outgoing, message);
  return container;
};

const barcodeCheck = (product) => {
  const form = node("form", undefined, "scanner");
  const label = node("label", "Штрихкод с упаковки ");
  const code = node("input");
  code.placeholder = "4 600000 000071";
  label.append(code);
  const submit = node("button", "Проверить штрихкод");
  submit.type = "submit";
  const result = node("output");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    result.textContent = "";
    result.className = "";
    try {
      const scanned = code.value.replaceAll(" ", "");
      const expected = product.barcode.replaceAll(" ", "");
      result.textContent = scanned === expected ? "Штрихкод совпадает" : "Это другой товар";
      if (scanned !== expected) result.className = "error";
    } catch (error) {
      result.textContent = "Не удалось проверить штрихкод. Ошибка передана разработчикам.";
      result.className = "error";
      reportError(error);
    }
  });
  form.append(label, submit, result);
  return form;
};

const startApp = async (config) => {
  const root = document.getElementById("root");
  const prefix = import.meta.env.BASE_URL.replace(/\/$/, "");
  const route = () => window.location.pathname.slice(prefix.length) || "/";
  const main = node("main");
  const header = node("header");
  header.append(
    node("h1", "Остатки"),
    node("span", `Версия ${__APP_VERSION__} · ${config.environment}`, "meta"),
  );
  const nav = node("nav");
  for (const [path, title] of [
    ["/", "Товары"],
    ["/products/42", "Карточка товара"],
    ["/reports", "Отчёт"],
  ]) {
    const link = node("a", title);
    link.href = `${prefix}${path}`;
    nav.append(link);
  }
  const error = node("p", "", "error");
  error.role = "alert";
  const content = node("div");
  main.append(header, nav, error, content);
  root.replaceChildren(main);
  let products = [];

  const render = async () => {
    const path = route();
    content.replaceChildren();
    if (path === "/reports") {
      content.append(node("p", "Загружаем отчёт…"));
      try {
        const { default: showReports } = await import("./reports.js");
        if (route() === path) await showReports(content, config.apiBase);
      } catch (reason) {
        if (route() === path) content.replaceChildren(node("p", reason.message, "error"));
      }
      return;
    }
    const selected = products.find((product) => `/products/${product.id}` === path);
    if (selected) {
      const article = node("article", undefined, "card");
      const image = node("img");
      image.src = box;
      image.alt = selected.name;
      const details = node("div");
      const stockLabel = node("p", `Цена ${selected.price} ₽ · на складе ${selected.stock} шт.`);
      details.append(
        node("h2", selected.name),
        stockLabel,
        movement(config.apiBase, selected, stockLabel),
        barcodeCheck(selected),
      );
      article.append(image, details);
      content.append(article);
      return;
    }
    if (path !== "/") {
      content.append(node("h2", "Товар не найден"));
      return;
    }
    const table = node("table");
    const heading = node("tr");
    for (const title of ["Товар", "Цена", "На складе"]) heading.append(node("th", title));
    const head = node("thead");
    head.append(heading);
    const body = node("tbody");
    for (const product of products) {
      const row = node("tr");
      const name = node("td");
      const link = node("a", product.name);
      link.href = `${prefix}/products/${product.id}`;
      name.append(link);
      row.append(name, node("td", `${product.price} ₽`), node("td", `${product.stock} шт.`));
      body.append(row);
    }
    table.append(head, body);
    content.append(table);
  };

  main.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    window.history.pushState({}, "", link.pathname);
    render();
  });
  window.addEventListener("popstate", render);
  const response = await fetch(`${config.apiBase}/products`);
  if (!response.ok) throw new Error(`API ответил ${response.status}`);
  products = await response.json();
  await render();
};

const start = async () => {
  const response = await fetch(`${import.meta.env.BASE_URL}app-config.json`);
  if (!response.ok) throw new Error(`Конфигурация недоступна: ${response.status}`);
  const config = await response.json();
  if (
    typeof config.apiBase !== "string" ||
    config.apiBase.trim() === "" ||
    typeof config.environment !== "string"
  ) {
    throw new Error("В конфигурации нужны apiBase и environment");
  }
  await startApp(config);
};

start().catch((error) => {
  document.getElementById("root").textContent = error.message;
});
