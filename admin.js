const dom = {
  title: document.getElementById("input-title"),
  client: document.getElementById("input-client"),
  intro: document.getElementById("input-intro"),
  groupsContainer: document.getElementById("groups-container"),
  addGroupBtn: document.getElementById("add-group"),
  downloadBtn: document.getElementById("download-json"),
  resetBtn: document.getElementById("reset-data"),
  groupTemplate: document.getElementById("group-template"),
  itemTemplate: document.getElementById("item-template"),
};

const initialState = {
  title: "",
  client: "",
  intro: "",
  groups: [],
};

const ensure = (value, fallback = "") => (value === undefined || value === null ? fallback : value);

const formatNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const createGroupElement = (groupData = {}) => {
  const group = dom.groupTemplate.content.firstElementChild.cloneNode(true);
  const labelInput = group.querySelector(".group-label");
  const itemsContainer = group.querySelector(".items-container");
  const addItemBtn = group.querySelector(".add-item");
  const removeGroupBtn = group.querySelector(".remove-group");

  labelInput.value = ensure(groupData.label);

  const addItemRow = (item = {}) => {
    const itemRow = dom.itemTemplate.content.firstElementChild.cloneNode(true);
    itemRow.querySelector(".item-type").value = ensure(item.type);
    itemRow.querySelector(".item-origin").value = ensure(item.origin);
    itemRow.querySelector(".item-price").value = ensure(item.price);
    itemRow.querySelector(".item-notes").value = ensure(item.notes);
    itemRow.querySelector(".item-highlight").checked = Boolean(item.highlight);

    itemRow.querySelector(".remove-item").addEventListener("click", () => {
      itemRow.remove();
    });

    itemsContainer.appendChild(itemRow);
  };

  (groupData.items || []).forEach((item) => addItemRow(item));

  addItemBtn.addEventListener("click", () => addItemRow());
  removeGroupBtn.addEventListener("click", () => group.remove());

  return { element: group, addItemRow };
};

const loadData = async () => {
  try {
    const response = await fetch("data.json");
    if (!response.ok) {
      throw new Error(`Failed to load data.json (status ${response.status})`);
    }
    const data = await response.json();
    applyData(data);
  } catch (error) {
    console.error(error);
    alert("تعذر تحميل data.json. تأكد من تشغيل الصفحة عبر خادم محلي.");
  }
};

const applyData = (data) => {
  const { title, client, intro, groups = [] } = data;
  initialState.title = ensure(title);
  initialState.client = ensure(client);
  initialState.intro = ensure(intro);
  initialState.groups = groups;

  dom.title.value = initialState.title;
  dom.client.value = initialState.client;
  dom.intro.value = initialState.intro;

  dom.groupsContainer.innerHTML = "";
  groups.forEach((group) => {
    const groupBlock = createGroupElement(group);
    dom.groupsContainer.appendChild(groupBlock.element);
  });
};

const collectItemData = (itemRow) => ({
  type: itemRow.querySelector(".item-type").value.trim(),
  origin: itemRow.querySelector(".item-origin").value.trim(),
  price: formatNumber(itemRow.querySelector(".item-price").value),
  notes: itemRow.querySelector(".item-notes").value.trim(),
  highlight: itemRow.querySelector(".item-highlight").checked || undefined,
});

const collectGroupData = (groupElement) => {
  const label = groupElement.querySelector(".group-label").value.trim();
  const items = Array.from(groupElement.querySelectorAll(".item-row"))
    .map(collectItemData)
    .filter((item) => item.type || item.origin || item.price);

  // Remove highlight property if falsey
  items.forEach((item) => {
    if (!item.highlight) {
      delete item.highlight;
    }
  });

  return {
    label,
    items,
  };
};

const collectData = () => {
  const groups = Array.from(dom.groupsContainer.querySelectorAll(".group-card"))
    .map(collectGroupData)
    .filter((group) => group.label || group.items.length > 0);

  return {
    title: dom.title.value.trim(),
    client: dom.client.value.trim(),
    intro: dom.intro.value.trim(),
    groups,
    total: groups
      .flatMap((group) => group.items)
      .reduce((sum, item) => sum + formatNumber(item.price), 0),
  };
};

const downloadJson = (data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "data.json";
  link.click();
  URL.revokeObjectURL(url);
};

const checkServer = async () => {
  try {
    const response = await fetch("/api/data", { method: "GET" });
    return response.ok;
  } catch (error) {
    return false;
  }
};

const saveData = async (data) => {
  try {
    // التحقق من أننا على نفس النطاق (localhost)
    const isLocalhost = window.location.hostname === "localhost" || 
                        window.location.hostname === "127.0.0.1" ||
                        window.location.hostname === "";

    if (!isLocalhost && window.location.protocol === "file:") {
      // إذا فُتحت الصفحة مباشرة (file://)، استخدم التنزيل
      downloadJson(data);
      alert("تم تنزيل ملف JSON. يرجى استبدال ملف data.json يدوياً.\n\nلتحديث الملف مباشرة، شغّل server.js وافتح الصفحة عبر http://localhost:3000/admin.html");
      return false;
    }

    const serverAvailable = await checkServer();
    if (!serverAvailable) {
      downloadJson(data);
      alert("الخادم غير متاح. تم تنزيل ملف JSON.\n\nلتحديث الملف مباشرة:\n1. شغّل: node server.js\n2. افتح: http://localhost:3000/admin.html");
      return false;
    }

    const response = await fetch("/api/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      alert("✅ تم حفظ البيانات بنجاح!");
      return true;
    } else {
      alert(`❌ خطأ في الحفظ: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error("خطأ في الحفظ:", error);
    downloadJson(data);
    alert(`تعذر الاتصال بالخادم.\n\nتم تنزيل ملف JSON كبديل.\n\nلتحديث الملف مباشرة:\n1. شغّل: node server.js\n2. افتح: http://localhost:3000/admin.html`);
    return false;
  }
};

const registerEvents = () => {
  dom.addGroupBtn.addEventListener("click", () => {
    const groupBlock = createGroupElement();
    dom.groupsContainer.appendChild(groupBlock.element);
    groupBlock.addItemRow(); // إضافة عنصر افتراضي
  });

  dom.downloadBtn.addEventListener("click", async () => {
    const data = collectData();
    await saveData(data);
  });

  dom.resetBtn.addEventListener("click", () => {
    if (confirm("سيتم تجاهل جميع التعديلات وإعادة تحميل البيانات الأصلية، هل أنت متأكد؟")) {
      loadData();
    }
  });
};

const updateServerStatus = async () => {
  const statusEl = document.getElementById("server-status");
  const indicator = statusEl?.querySelector(".status-indicator");
  const text = statusEl?.querySelector(".status-text");

  if (!statusEl || !indicator || !text) return;

  const isOnline = await checkServer();
  
  if (isOnline) {
    indicator.className = "status-indicator online";
    text.textContent = "✅ الخادم متاح - يمكنك حفظ البيانات مباشرة";
  } else {
    indicator.className = "status-indicator offline";
    if (window.location.protocol === "file:") {
      text.textContent = "⚠️ افتح الصفحة عبر http://localhost:3000/admin.html بعد تشغيل server.js";
    } else {
      text.textContent = "❌ الخادم غير متاح - سيتم تنزيل ملف JSON كبديل";
    }
  }
};

registerEvents();
loadData();
updateServerStatus();
// تحديث حالة الخادم كل 5 ثوان
setInterval(updateServerStatus, 5000);

