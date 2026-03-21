const canvas = document.getElementById("wheel");
const spinButton = document.getElementById("spin-button");
const resetButton = document.querySelector(".card-reset");
const optionsList = document.querySelector(".options-list");
const optionsCount = document.querySelector(".options-count");
const resultModal = document.getElementById("result-modal");
const resultTitle = document.getElementById("result-title");
const acceptFateButton = document.getElementById("accept-fate");
const spinAgainButton = document.getElementById("spin-again");
const decisionTitle = document.getElementById("decision-title");
const decisionDescription = document.getElementById("decision-description");
const optionsPanelTitle = document.getElementById("options-panel-title");
const createWheelForm = document.getElementById("create-wheel-form");
const PRESET_STORAGE_KEY = "fateSpinnerPreset";
const HISTORY_STORAGE_KEY = "fateSpinnerHistory";
const PAGE_TRANSITION_DURATION = 260;

const presetPalette = ["#ff7a45", "#4d6aff", "#2ec4a6", "#f4c95d", "#e78dd0"];
const presetDotClasses = ["dot-orange", "dot-blue", "dot-green", "dot-yellow", "dot-pink"];

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function splitPresetTitle(title) {
    const words = title.trim().split(/\s+/);
    if (words.length <= 1) {
        return `${title}<span></span>`;
    }

    const head = words.slice(0, -1).join(" ");
    const tail = words[words.length - 1];
    return `${head} <span>${tail}</span>`;
}

function renderOptions(options) {
    if (!optionsList) {
        return;
    }

    optionsList.innerHTML = options.map((label, index) => `
        <div class="option-row" data-label="${escapeHtml(label)}" data-color="${presetPalette[index % presetPalette.length]}">
            <span class="option-dot ${presetDotClasses[index % presetDotClasses.length]}"></span>
            <span class="option-text">${escapeHtml(label)}</span>
            <button class="option-remove" type="button" aria-label="Remove ${escapeHtml(label)}">-</button>
        </div>
    `).join("");
}

function applyStoredPreset() {
    if (!decisionTitle || !decisionDescription || !optionsPanelTitle || !optionsList) {
        return;
    }

    const rawPreset = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!rawPreset) {
        return;
    }

    try {
        const preset = JSON.parse(rawPreset);
        if (!preset?.title || !Array.isArray(preset.options) || preset.options.length < 2) {
            return;
        }

        decisionTitle.innerHTML = splitPresetTitle(preset.title);
        decisionDescription.textContent = preset.description || "Let destiny decide.";
        optionsPanelTitle.textContent = preset.title;
        renderOptions(preset.options);
    } catch (error) {
        console.error("Failed to parse stored preset", error);
    }
}

function clearHistoryOnReload() {
    const navigationEntry = performance.getEntriesByType("navigation")[0];
    if (navigationEntry && navigationEntry.type === "reload") {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
}

function getWheelTitleText() {
    if (!decisionTitle) {
        return "Decision Wheel";
    }

    return decisionTitle.textContent?.replace(/\s+/g, " ").trim() || "Decision Wheel";
}

function inferHistoryCategory(title) {
    const normalized = title.toLowerCase();

    if (normalized.includes("restaurant") || normalized.includes("startup") || normalized.includes("domain")) {
        return "business";
    }

    if (normalized.includes("cocktail") || normalized.includes("wine") || normalized.includes("menu")) {
        return "food & drink";
    }

    if (normalized.includes("vacation") || normalized.includes("cities") || normalized.includes("date")) {
        return "lifestyle";
    }

    return "personal";
}

function formatHistoryDateParts(timestamp) {
    const date = new Date(timestamp);
    const dateText = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);

    const timeText = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    }).format(date);

    return { dateText, timeText };
}

function saveSpinToHistory(wheelTitle, winner) {
    if (!wheelTitle || !winner) {
        return;
    }

    const existing = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        wheelTitle,
        category: inferHistoryCategory(wheelTitle),
        winner,
        timestamp: new Date().toISOString()
    };

    existing.unshift(entry);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
}

function renderHistoryPage() {
    const emptyState = document.getElementById("history-empty-state");
    const historyTable = document.getElementById("history-table");
    const historyList = document.getElementById("history-list");

    if (!emptyState || !historyTable || !historyList) {
        return;
    }

    const historyItems = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    const hasHistory = historyItems.length > 0;

    emptyState.hidden = hasHistory;
    historyTable.hidden = !hasHistory;

    if (!hasHistory) {
        historyList.innerHTML = "";
        return;
    }

    historyList.innerHTML = historyItems.map((item) => {
        const { dateText, timeText } = formatHistoryDateParts(item.timestamp);
        return `
            <article class="history-row">
                <div class="history-cell history-cell-wheel">
                    <h3 class="history-wheel-title">${escapeHtml(item.wheelTitle)}</h3>
                    <p class="history-wheel-category">${escapeHtml(item.category)}</p>
                </div>
                <div class="history-cell history-cell-date">
                    <p class="history-date-main">${dateText}</p>
                    <p class="history-date-sub">${timeText}</p>
                </div>
                <div class="history-cell history-cell-result">
                    <p class="history-result-text">${escapeHtml(item.winner)}</p>
                </div>
            </article>
        `;
    }).join("");
}

function navigateWithTransition(href) {
    if (!href || href === window.location.href) {
        return;
    }

    document.body.classList.add("page-leaving");
    window.setTimeout(() => {
        window.location.href = href;
    }, PAGE_TRANSITION_DURATION);
}

function setupPageTransition() {
    requestAnimationFrame(() => {
        document.body.classList.add("page-ready");
    });

    document.querySelectorAll(".logo, .nav-link").forEach((element) => {
        element.addEventListener("click", (event) => {
            const href = element.getAttribute("href");
            if (!href || href.startsWith("#") || href === "#") {
                return;
            }

            event.preventDefault();
            navigateWithTransition(href);
        });
    });
}

function setupPresetCards() {
    const presetCards = document.querySelectorAll(".preset-card");
    const activatePreset = (card) => {
        const title = card.dataset.title?.trim();
        const description = card.dataset.description?.trim();
        const options = card.dataset.options?.split("|").map((item) => item.trim()).filter(Boolean);

        if (!title || !options || options.length < 2) {
            return;
        }

        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify({ title, description, options }));
        navigateWithTransition("./index.html");
    };

    presetCards.forEach((card) => {
        card.addEventListener("click", () => activatePreset(card));
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activatePreset(card);
            }
        });
    });
}

function setupCreateWheelForm() {
    if (!createWheelForm) {
        return;
    }

    createWheelForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(createWheelForm);
        const title = String(formData.get("wheel_name") || "").trim();
        const description = String(formData.get("description") || "").trim();
        const category = String(formData.get("category") || "").trim();
        const accentColor = String(formData.get("accent_color") || "#ff6b35");
        const options = String(formData.get("options") || "")
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);

        if (!title || options.length < 2) {
            return;
        }

        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify({
            title,
            description: description || category || "Let destiny decide.",
            options,
            accentColor
        }));

        navigateWithTransition("./index.html");
    });
}

function setupLinkButtons() {
    document.querySelectorAll("[data-preset-link], [data-mobile-link]").forEach((element) => {
        element.addEventListener("click", () => {
            const href = element.getAttribute("data-preset-link") || element.getAttribute("data-mobile-link");
            if (href) {
                navigateWithTransition(href);
            }
        });
    });
}

setupPageTransition();
clearHistoryOnReload();
applyStoredPreset();
setupPresetCards();
setupCreateWheelForm();
setupLinkButtons();
renderHistoryPage();

if (canvas && spinButton && optionsList && optionsCount) {
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 12;
    const textRadius = radius - 54;
    const initialAngle = -Math.PI / 2;

    let angle = initialAngle;
    let spinning = false;
    let animationFrameId = null;

    function getSegments() {
        return Array.from(optionsList.querySelectorAll(".option-row")).map((row) => ({
            label: row.dataset.label || row.querySelector(".option-text")?.textContent?.trim() || "",
            color: row.dataset.color || "#4d6aff"
        }));
    }

    function shortenLabel(label) {
        return label.length > 14 ? `${label.slice(0, 12)}...` : label;
    }

    function updateOptionsCount() {
        const count = optionsList.querySelectorAll(".option-row").length;
        optionsCount.textContent = `${count} Item${count === 1 ? "" : "s"}`;
        optionsList.classList.toggle("is-scrollable", count > 5);
    }

    function setRemoveButtonsState(disabled) {
        optionsList.querySelectorAll(".option-remove").forEach((button) => {
            button.disabled = disabled;
        });
    }

    function normalizeAngle(value) {
        const fullTurn = Math.PI * 2;
        return ((value % fullTurn) + fullTurn) % fullTurn;
    }

    function getWinningSegment(segments) {
        if (!segments.length) {
            return null;
        }

        const arc = (2 * Math.PI) / segments.length;
        const pointerAngle = normalizeAngle((-Math.PI / 2) - angle);
        const index = Math.floor(pointerAngle / arc) % segments.length;
        return segments[index];
    }

    function openResultModal(label) {
        if (!resultModal || !resultTitle) {
            return;
        }

        saveSpinToHistory(getWheelTitleText(), label);
        resultTitle.textContent = label;
        resultModal.classList.add("is-visible");
        resultModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }

    function closeResultModal() {
        if (!resultModal) {
            return;
        }

        resultModal.classList.remove("is-visible");
        resultModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
    }

    function drawWheel() {
        const segments = getSegments();

        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        ctx.arc(center, center, radius + 10, 0, Math.PI * 2);
        ctx.fill();

        if (segments.length === 0) {
            ctx.beginPath();
            ctx.fillStyle = "#f4f6fb";
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#7e8ea9";
            ctx.font = '700 34px "Spline Sans", sans-serif';
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("No options", center, center);
            return;
        }

        const arc = (2 * Math.PI) / segments.length;

        for (let i = 0; i < segments.length; i += 1) {
            const startAngle = angle + i * arc;
            const endAngle = startAngle + arc;

            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = segments[i].color;
            ctx.fill();

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + arc / 2);
            ctx.fillStyle = "#ffffff";
            ctx.font = '700 28px "Spline Sans", sans-serif';
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(shortenLabel(segments[i].label), textRadius, 0);
            ctx.restore();
        }

        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.strokeStyle = "#ffffff";
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    function spinWheel() {
        const segments = getSegments();
        if (spinning || segments.length < 2) {
            return;
        }

        const arc = (2 * Math.PI) / segments.length;

        spinning = true;
        spinButton.disabled = true;
        if (resetButton) {
            resetButton.disabled = true;
        }
        setRemoveButtonsState(true);

        const startAngle = angle;
        const extraTurns = (Math.random() * 3 + 5) * Math.PI * 2;
        const targetAngle = startAngle + extraTurns + Math.random() * arc;
        const duration = 4200;
        let startTime = null;

        function animate(timestamp) {
            if (!startTime) {
                startTime = timestamp;
            }

            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);

            angle = startAngle + (targetAngle - startAngle) * eased;
            drawWheel();

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
                return;
            }

            spinning = false;
            spinButton.disabled = false;
            if (resetButton) {
                resetButton.disabled = false;
            }
            setRemoveButtonsState(false);
            animationFrameId = null;

            const winner = getWinningSegment(segments);
            if (winner) {
                openResultModal(winner.label);
            }
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    function resetWheel() {
        if (spinning) {
            return;
        }

        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        angle = initialAngle;
        closeResultModal();
        spinButton.disabled = false;
        if (resetButton) {
            resetButton.disabled = false;
        }
        setRemoveButtonsState(false);
        drawWheel();
    }

    optionsList.addEventListener("click", (event) => {
        const removeButton = event.target.closest(".option-remove");
        if (!removeButton || spinning) {
            return;
        }

        const row = removeButton.closest(".option-row");
        if (!row) {
            return;
        }

        row.remove();
        updateOptionsCount();
        resetWheel();
    });

    spinButton.addEventListener("click", spinWheel);
    resetButton?.addEventListener("click", resetWheel);
    acceptFateButton?.addEventListener("click", closeResultModal);
    spinAgainButton?.addEventListener("click", () => {
        closeResultModal();
        spinWheel();
    });
    resultModal?.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.dataset.closeModal === "true") {
            closeResultModal();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeResultModal();
        }
    });

    updateOptionsCount();
    drawWheel();
}
