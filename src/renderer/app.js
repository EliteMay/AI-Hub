const grid = document.querySelector("#module-grid");
const count = document.querySelector("#module-count");
const ssdStatus = document.querySelector("#ssd-status");
const template = document.querySelector("#module-card-template");
const homeNav = document.querySelector("#home-nav");
const moduleNavItems = [...document.querySelectorAll(".module-nav")];

function moduleInitials(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function setActiveNav(moduleId = null) {
  homeNav.classList.toggle("active", moduleId === null);
  for (const item of moduleNavItems) {
    item.classList.toggle("active", item.dataset.moduleId === moduleId);
  }
}

async function openEmbeddedModule(moduleId) {
  const result = await window.aiHub.openModuleView(moduleId);
  if (result.ok) {
    setActiveNav(moduleId);
  }
  return result;
}

function renderModule(module) {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".module-card");
  const icon = fragment.querySelector(".module-icon");
  const pill = fragment.querySelector(".status-pill");
  const title = fragment.querySelector("h3");
  const description = fragment.querySelector(".module-description");
  const repository = fragment.querySelector(".repository");
  const button = fragment.querySelector(".launch-button");
  const message = fragment.querySelector(".module-message");

  icon.textContent = moduleInitials(module.name);
  title.textContent = module.name;
  description.textContent = module.description;
  repository.textContent = module.repository;

  if (module.mode === "hub-renderer" && module.embeddedAvailable) {
    pill.textContent = "Hub統合";
    pill.dataset.state = "ok";
    button.textContent = "Hub内で開く";
  } else if (module.installed) {
    pill.textContent = "利用可能";
    pill.dataset.state = "ok";
  } else {
    pill.textContent = "未検出";
    pill.dataset.state = "missing";
    button.disabled = true;
    button.textContent = "見つかりません";
  }

  button.addEventListener("click", async () => {
    button.disabled = true;

    if (module.mode === "hub-renderer" && module.embeddedAvailable) {
      message.textContent = "Hub内で開いています…";
      const result = await openEmbeddedModule(module.id);
      message.textContent = result.ok ? "" : (result.error ?? "開けませんでした。");
    } else {
      message.textContent = "起動中…";
      const result = await window.aiHub.launchModule(module.id);
      message.textContent = result.ok ? "起動しました。" : (result.error ?? "起動できませんでした。");
    }

    button.disabled = false;
  });

  grid.append(card);
}

homeNav.addEventListener("click", async () => {
  await window.aiHub.showHome();
  setActiveNav();
});

for (const item of moduleNavItems) {
  item.addEventListener("click", async () => {
    const result = await openEmbeddedModule(item.dataset.moduleId);
    if (!result.ok) {
      item.title = result.error ?? "Moduleを開けませんでした。";
    }
  });
}

async function init() {
  const [modules, ssd] = await Promise.all([
    window.aiHub.listModules(),
    window.aiHub.getSsdStatus()
  ]);

  count.textContent = `${modules.filter((item) => item.installed || item.embeddedAvailable).length} / ${modules.length} 利用可能`;
  modules.forEach(renderModule);

  const localAi = modules.find((item) => item.id === "local-ai-lab");
  const localAiNav = moduleNavItems.find((item) => item.dataset.moduleId === "local-ai-lab");
  if (localAiNav && !localAi?.embeddedAvailable) {
    localAiNav.disabled = true;
    localAiNav.querySelector("small").textContent = "未検出";
  }

  if (ssd.available) {
    ssdStatus.textContent = `SSD 接続済み · ${ssd.managedRoot ?? "D:\\AI"}`;
    ssdStatus.dataset.state = "ok";
  } else {
    ssdStatus.textContent = "AI SSD 未検出";
    ssdStatus.dataset.state = "missing";
  }
}

init().catch((error) => {
  grid.textContent = `初期化に失敗しました: ${error.message}`;
});
