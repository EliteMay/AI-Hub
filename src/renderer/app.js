const grid = document.querySelector("#module-grid");
const count = document.querySelector("#module-count");
const ssdStatus = document.querySelector("#ssd-status");
const template = document.querySelector("#module-card-template");

function moduleInitials(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

  if (module.installed) {
    pill.textContent = "利用可能";
    pill.dataset.state = "ok";
  } else {
    pill.textContent = "未検出";
    pill.dataset.state = "missing";
    button.disabled = true;
    button.textContent = "見つかりません";
  }

  button.addEventListener("click", async () => {
    message.textContent = "起動中…";
    button.disabled = true;

    const result = await window.aiHub.launchModule(module.id);
    if (result.ok) {
      message.textContent = "起動しました。";
    } else {
      message.textContent = result.error ?? "起動できませんでした。";
    }

    button.disabled = !module.installed;
  });

  grid.append(card);
}

async function init() {
  const [modules, ssd] = await Promise.all([
    window.aiHub.listModules(),
    window.aiHub.getSsdStatus()
  ]);

  count.textContent = `${modules.filter((item) => item.installed).length} / ${modules.length} 利用可能`;
  modules.forEach(renderModule);

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
