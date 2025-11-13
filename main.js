const elements = {
  title: document.querySelector(".quote-title"),
  client: document.querySelector(".quote-client"),
  intro: document.querySelector(".quote-intro p"),
  tbody: document.getElementById("quote-body"),
};

const highlightClass = "highlight";

const formatNumber = (value) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const createCell = (content, className) => {
  const cell = document.createElement("td");
  if (className) {
    cell.className = className;
  }
  if (content !== undefined && content !== null) {
    cell.textContent = content;
  }
  return cell;
};

const appendGroupRows = (tbody, group) => {
  const { label, items = [] } = group;
  if (!items.length) {
    return 0;
  }

  let groupTotal = 0;

  items.forEach((item, index) => {
    const row = document.createElement("tr");

    if (index === 0) {
      const labelCell = createCell(label, "group-cell");
      labelCell.rowSpan = items.length;
      row.appendChild(labelCell);
    }

    const { type, origin, price, notes, highlight } = item;
    const highlightCls = highlight ? highlightClass : "";
    const numericPrice = Number(price) || 0;
    groupTotal += numericPrice;

    row.appendChild(createCell(type, highlightCls));
    row.appendChild(createCell(origin, highlightCls));
    row.appendChild(createCell(formatNumber(numericPrice), highlightCls));
    row.appendChild(createCell(notes ?? ""));

    tbody.appendChild(row);
  });

  return groupTotal;
};

const appendTotalRow = (tbody, total) => {
  const row = document.createElement("tr");
  row.className = "total-row";

  const label = createCell("الإجمالي", "total-label");
  label.colSpan = 3;

  const value = createCell(formatNumber(total), "total-value");

  const notes = createCell("");

  row.append(label, value, notes);
  tbody.appendChild(row);
};

const appendSpacerRows = (tbody, count = 2) => {
  for (let i = 0; i < count; i += 1) {
    const row = document.createElement("tr");
    row.className = "spacer-row";
    const cell = createCell("");
    cell.colSpan = 5;
    row.appendChild(cell);
    tbody.appendChild(row);
  }
};

const populateQuote = (data) => {
  if (!elements.tbody) {
    return;
  }

  const { title, client, intro, groups = [] } = data;

  if (title && elements.title) {
    elements.title.textContent = title;
  }
  if (client && elements.client) {
    elements.client.textContent = client;
  }
  if (intro && elements.intro) {
    elements.intro.innerHTML = intro.replace(/\n/g, "<br>");
  }

  elements.tbody.innerHTML = "";

  let computedTotal = 0;
  groups.forEach((group) => {
    computedTotal += appendGroupRows(elements.tbody, group);
  });

  appendTotalRow(elements.tbody, computedTotal);

  appendSpacerRows(elements.tbody);
};

const showError = (message) => {
  if (!elements.tbody) {
    return;
  }
  const row = document.createElement("tr");
  const cell = createCell(message);
  cell.colSpan = 5;
  cell.style.color = "red";
  cell.style.textAlign = "center";
  row.appendChild(cell);
  elements.tbody.appendChild(row);
};

const loadQuote = async () => {
  try {
    const response = await fetch("data.json");
    if (!response.ok) {
      throw new Error(`فشل تحميل البيانات (status ${response.status})`);
    }
    const data = await response.json();
    populateQuote(data);
  } catch (error) {
    showError("تعذر تحميل بيانات العرض. الرجاء المحاولة مرة أخرى.");
    console.error(error);
  }
};

loadQuote();

