const grid = document.querySelector("#module-grid");
const count = document.querySelector("#module-count");
const ssdStatus = document.querySelector("#ssd-status");
const settingsSsdStatus = document.querySelector("#settings-ssd-status");
const template = document.querySelector("#module-card-template");
const homeNav = document.querySelector("#home-nav");
const settingsNav = document.querySelector("#settings-nav");
const moduleNavItems = [...document.querySelectorAll(".module-nav")];
const homeView = document.querySelector("#home-view");
const settingsView = document.querySelector("#settings-view");
const notificationsEnabled = document.querySelector("#notifications-enabled");
const startupModule = document.querySelector("#startup-module");
const repositoryRoot = document.querySelector("#repository-root");
const repositoryRootButton = document.querySelector("#repository-root-button");
const settingsConfigPath = document.querySelector("#settings-config-path");
const saveSharedSettingsButton = document.querySelector("#save-shared-settings");
const sharedSettingsMessage = document.querySelector("#shared-settings-message");

let modules = [];
let sharedSettings = null;

function moduleInitials(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function setActiveNav(target = "home") {
  homeNav.classList.toggle("active", target === "home");
  settingsNav.classList.toggle("active", target === "settings");

  for (const item of moduleNavItems) {
    item.classList.toggle("active", item.dataset.moduleId === target);
  }
}

async function showHostView(target) {
  await window.aiHub.showHome();
  homeView.classList.toggle("hidden", target !== "home");
  settingsView.classList.toggle("hidden", target !== "settings");
  setActiveNav(target);
}

async function openEmbeddedModule(moduleId) {
  const result = await window.aiHub.openModuleView(moduleId);
  if (result.ok) setActiveNav(moduleId);
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

function populateStartupModules() {
  const embedded = modules.filter((item) => item.mode === "hub-renderer" && item.embeddedAvailable);
  for (const module of embedded) {
    const option = document.createElement("option");
    option.value = module.id;
    option.textContent = module.name;
    startupModule.append(option);
  }
}

function renderSsdStatus(ssd) {
  const text = ssd.available
    ? `SSD 接続済み · ${ssd.managedRoot ?? "D:\\AI"}`
    : "AI SSD 未検出";
  const state = ssd.available ? "ok" : "missing";

  for (const element of [ssdStatus, settingsSsdStatus]) {
    element.textContent = text;
    element.dataset.state = state;
  }
}

function renderSharedSettings(settings) {
  sharedSettings = settings;
  notificationsEnabled.checked = settings.notificationsEnabled !== false;
  startupModule.value = settings.startupModuleId || "";
  repositoryRoot.value = settings.repositoryRoot || "";
  settingsConfigPath.textContent = settings.configPath || "Fallback保存";
}

homeNav.addEventListener("click", () => showHostView("home"));
settingsNav.addEventListener("click", () => showHostView("settings"));

for (const item of moduleNavItems) {
  item.addEventListener("click", async () => {
    const result = await openEmbeddedModule(item.dataset.moduleId);
    if (!result.ok) {
      item.title = result.error ?? "Moduleを開けませんでした。";
    }
  });
}

repositoryRootButton.addEventListener("click", async () => {
  const selected = await window.aiHub.selectSharedRepositoryRoot();
  if (selected) repositoryRoot.value = selected;
});

saveSharedSettingsButton.addEventListener("click", async () => {
  saveSharedSettingsButton.disabled = true;
  sharedSettingsMessage.textContent = "保存中…";

  try {
    const next = await window.aiHub.saveSharedSettings({
      notificationsEnabled: notificationsEnabled.checked,
      startupModuleId: startupModule.value,
      repositoryRoot: repositoryRoot.value
    });
    renderSharedSettings(next);
    sharedSettingsMessage.textContent = "共通設定を保存しました。Hub内Moduleへ反映済みです。";
  } catch (error) {
    sharedSettingsMessage.textContent = error?.message || "共通設定を保存できませんでした。";
  } finally {
    saveSharedSettingsButton.disabled = false;
  }
});

async function init() {
  const [loadedModules, ssd, settings] = await Promise.all([
    window.aiHub.listModules(),
    window.aiHub.getSsdStatus(),
    window.aiHub.getSharedSettings()
  ]);

  modules = loadedModules;
  count.textContent = `${modules.filter((item) => item.installed || item.embeddedAvailable).length} / ${modules.length} 利用可能`;
  modules.forEach(renderModule);
  populateStartupModules();
  renderSsdStatus(ssd);
  renderSharedSettings(settings);

  const localAi = modules.find((item) => item.id === "local-ai-lab");
  const localAiNav = moduleNavItems.find((item) => item.dataset.moduleId === "local-ai-lab");
  if (localAiNav && !localAi?.embeddedAvailable) {
    localAiNav.disabled = true;
    localAiNav.querySelector("small").textContent = "未検出";
  }
}

init().catch((error) => {
  grid.textContent = `初期化に失敗しました: ${error.message}`;
});
