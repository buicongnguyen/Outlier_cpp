(function () {
  "use strict";

  const data = window.assessmentLabData;
  const storageKey = "cpp-assessment-labs-v1";
  const hintPenalty = 2;

  if (!data || !Array.isArray(data.tasks) || data.tasks.length === 0) {
    const workspace = document.getElementById("workspace");
    if (workspace) {
      workspace.textContent = "The assessment task data could not be loaded.";
    }
    return;
  }

  const taskById = new Map(data.tasks.map((task) => [task.id, task]));
  const taskList = document.getElementById("task-list");
  const workspace = document.getElementById("workspace");
  const timerBar = document.getElementById("timer-bar");
  const timerKicker = document.getElementById("timer-kicker");
  const timerDisplay = document.getElementById("timer-display");
  const timerStatus = document.getElementById("timer-status");
  const fullMockButton = document.getElementById("full-mock");
  const clearScoresButton = document.getElementById("reset-suite-score");
  const suiteScore = document.getElementById("suite-score");
  const suiteProgress = document.getElementById("suite-progress");
  const announcer = document.getElementById("lab-announcer");
  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));

  function defaultTaskState() {
    return {
      status: "idle",
      deadline: null,
      draft: "",
      rubric: [],
      hintUsed: false
    };
  }

  function defaultState() {
    return {
      activeTaskId: data.tasks[0].id,
      filter: "all",
      fullMock: {
        status: "idle",
        deadline: null,
        endedReason: null
      },
      tasks: Object.fromEntries(data.tasks.map((task) => [task.id, defaultTaskState()]))
    };
  }

  function loadState() {
    const fallback = defaultState();
    let parsed;
    try {
      parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch (error) {
      return fallback;
    }
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    if (taskById.has(parsed.activeTaskId)) {
      fallback.activeTaskId = parsed.activeTaskId;
    }
    if (["all", "coding", "debugging", "review"].includes(parsed.filter)) {
      fallback.filter = parsed.filter;
    }

    if (parsed.fullMock && typeof parsed.fullMock === "object") {
      if (["idle", "running", "complete"].includes(parsed.fullMock.status)) {
        fallback.fullMock.status = parsed.fullMock.status;
      }
      if (Number.isFinite(parsed.fullMock.deadline)) {
        fallback.fullMock.deadline = parsed.fullMock.deadline;
      }
      if (["submitted", "expired", null].includes(parsed.fullMock.endedReason)) {
        fallback.fullMock.endedReason = parsed.fullMock.endedReason;
      }
    }

    for (const task of data.tasks) {
      const saved = parsed.tasks && parsed.tasks[task.id];
      if (!saved || typeof saved !== "object") {
        continue;
      }
      const target = fallback.tasks[task.id];
      if (["idle", "running", "revealed"].includes(saved.status)) {
        target.status = saved.status;
      }
      if (Number.isFinite(saved.deadline)) {
        target.deadline = saved.deadline;
      }
      if (typeof saved.draft === "string") {
        target.draft = saved.draft;
      }
      if (typeof saved.hintUsed === "boolean") {
        target.hintUsed = saved.hintUsed;
      }
      if (Array.isArray(saved.rubric)) {
        const validRubricIds = new Set(task.rubric.map((item) => item.id));
        target.rubric = saved.rubric.filter((id) => validRubricIds.has(id));
      }
    }

    if (fallback.fullMock.status === "running") {
      for (const task of data.tasks) {
        fallback.tasks[task.id].status = "running";
        fallback.tasks[task.id].deadline = null;
      }
    } else if (fallback.fullMock.status === "complete") {
      for (const task of data.tasks) {
        fallback.tasks[task.id].status = "revealed";
        fallback.tasks[task.id].deadline = null;
      }
    } else {
      const runningTasks = data.tasks.filter((task) => fallback.tasks[task.id].status === "running");
      const retained = runningTasks.find((task) => task.id === fallback.activeTaskId) || runningTasks[0];
      for (const task of runningTasks) {
        const taskState = fallback.tasks[task.id];
        if (task.id !== retained.id || !Number.isFinite(taskState.deadline)) {
          taskState.status = "idle";
          taskState.deadline = null;
        }
      }
    }
    return fallback;
  }

  let state = loadState();

  function persistState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      // The page remains usable if storage is disabled or full.
    }
  }

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function announce(message) {
    announcer.textContent = "";
    window.setTimeout(() => {
      announcer.textContent = message;
    }, 0);
  }

  function focusAfterRender(id) {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (target) {
        target.focus();
      }
    });
  }

  function addHeading(parent, text, level) {
    const heading = element(level || "h4", "block-heading", text);
    parent.appendChild(heading);
    return heading;
  }

  function addList(parent, values, className) {
    const list = element("ul", className || "instruction-list");
    for (const value of values) {
      list.appendChild(element("li", "", value));
    }
    parent.appendChild(list);
    return list;
  }

  function addCodeBlock(parent, code, label) {
    const wrap = element("div", "code-wrap");
    const pre = element("pre", "code-block");
    const codeElement = element("code", "", code);
    pre.appendChild(codeElement);
    wrap.appendChild(pre);

    const copy = element("button", "copy-button", "Copy");
    copy.type = "button";
    copy.setAttribute("aria-label", `Copy ${label || "code"}`);
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        copy.textContent = "Copied";
        window.setTimeout(() => {
          copy.textContent = "Copy";
        }, 1400);
      } catch (error) {
        copy.textContent = "Select code";
      }
    });
    wrap.appendChild(copy);
    parent.appendChild(wrap);
    return wrap;
  }

  function filteredTasks() {
    if (state.filter === "all") {
      return data.tasks;
    }
    return data.tasks.filter((task) => task.kind === state.filter);
  }

  function individualRunningTask() {
    if (state.fullMock.status === "running") {
      return null;
    }
    return data.tasks.find((task) => state.tasks[task.id].status === "running") || null;
  }

  function taskScore(task) {
    const taskState = state.tasks[task.id];
    const selected = new Set(taskState.rubric);
    const earned = task.rubric.reduce(
      (sum, item) => sum + (selected.has(item.id) ? item.points : 0),
      0
    );
    return Math.max(0, earned - (taskState.hintUsed ? hintPenalty : 0));
  }

  function renderScoreSummary() {
    const total = data.tasks.reduce((sum, task) => sum + taskScore(task), 0);
    const revealed = data.tasks.filter((task) => state.tasks[task.id].status === "revealed").length;
    suiteScore.textContent = `${total} / 100`;
    suiteProgress.textContent = `${revealed} of ${data.tasks.length} revealed`;
  }

  function renderFilters() {
    for (const button of filterButtons) {
      const active = button.dataset.filter === state.filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }

  function renderTaskList() {
    taskList.replaceChildren();
    const tasks = filteredTasks();
    if (tasks.length === 0) {
      taskList.appendChild(element("p", "empty-task-list", "No tasks match this filter."));
      return;
    }

    for (const task of tasks) {
      const taskState = state.tasks[task.id];
      const button = element("button", "task-button");
      button.type = "button";
      button.classList.toggle("active", task.id === state.activeTaskId);
      button.classList.toggle("complete", taskState.status === "revealed");
      button.setAttribute("aria-current", task.id === state.activeTaskId ? "true" : "false");

      let status = "Not started";
      if (taskState.status === "running") {
        status = "In progress";
      } else if (taskState.status === "revealed") {
        status = `${taskScore(task)} / ${task.points} pts`;
      }
      button.appendChild(element("span", "task-list-number", `Task ${task.number}`));
      button.appendChild(element("span", "task-list-title", task.title));
      const meta = element("span", "task-list-meta");
      meta.appendChild(element("span", "", `${task.minutes} min · ${task.points} pts`));
      meta.appendChild(element("span", "", status));
      button.appendChild(meta);
      button.addEventListener("click", () => {
        state.activeTaskId = task.id;
        persistState();
        renderAll();
        focusAfterRender("task-heading");
        announce(`Task ${task.number} selected: ${task.title}.`);
      });
      taskList.appendChild(button);
    }
  }

  function renderTests(parent, title, tests) {
    const panel = element("section", "test-panel");
    panel.appendChild(element("h4", "", title));
    addList(panel, tests, "test-list");
    parent.appendChild(panel);
  }

  function renderAnswer(parent, task) {
    const taskState = state.tasks[task.id];
    const panel = element("section", "answer-panel");
    const answerHeading = element("h3", "", "Reference answer & evidence-based scoring");
    answerHeading.id = "answer-heading";
    answerHeading.tabIndex = -1;
    panel.appendChild(answerHeading);
    const scoringNote = element(
      "p",
      "section-note",
      "Check a criterion only when the required evidence is present in your saved draft. Do not award points for what you intended to write."
    );
    panel.appendChild(scoringNote);

    const reasoning = element("div", "solution-section");
    reasoning.appendChild(element("h4", "", "Reference reasoning"));
    for (const paragraph of task.solutionText) {
      reasoning.appendChild(element("p", "", paragraph));
    }
    panel.appendChild(reasoning);

    if (task.solutionCode) {
      const solution = element("div", "solution-section");
      solution.appendChild(element("h4", "", "Reference code"));
      addCodeBlock(solution, task.solutionCode, "reference code");
      panel.appendChild(solution);
    }

    const hidden = element("div", "solution-section");
    renderTests(hidden, "Previously hidden edge cases", task.hiddenTests);
    panel.appendChild(hidden);

    const rubric = element("div", "solution-section");
    rubric.appendChild(element("h4", "", "Task rubric"));
    const rubricList = element("div", "rubric-list");
    const selected = new Set(taskState.rubric);
    for (const item of task.rubric) {
      const label = element("label", "rubric-item");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selected.has(item.id);
      checkbox.addEventListener("change", () => {
        const current = new Set(state.tasks[task.id].rubric);
        if (checkbox.checked) {
          current.add(item.id);
        } else {
          current.delete(item.id);
        }
        state.tasks[task.id].rubric = Array.from(current);
        persistState();
        renderScoreSummary();
        renderTaskList();
        const value = document.getElementById("task-score-value");
        if (value) {
          value.textContent = `${taskScore(task)} / ${task.points}`;
        }
      });
      label.appendChild(checkbox);
      label.appendChild(element("span", "", item.text));
      label.appendChild(element("span", "rubric-points", `${item.points} pt${item.points === 1 ? "" : "s"}`));
      rubricList.appendChild(label);
    }
    rubric.appendChild(rubricList);

    const score = element("div", "task-score");
    score.appendChild(element("span", "", "Your evidence-backed score"));
    const scoreValue = element("strong", "", `${taskScore(task)} / ${task.points}`);
    scoreValue.id = "task-score-value";
    score.appendChild(scoreValue);
    rubric.appendChild(score);
    if (taskState.hintUsed) {
      rubric.appendChild(
        element("p", "penalty-note", `Hint used: ${hintPenalty}-point practice penalty applied to this task.`)
      );
    }
    panel.appendChild(rubric);
    parent.appendChild(panel);
  }

  function resetTask(task) {
    if (expireDueTimers()) {
      return;
    }
    const existing = state.tasks[task.id];
    const hasWork = existing.draft.trim() || existing.rubric.length || existing.status !== "idle";
    if (hasWork && !window.confirm(`Clear the saved draft, timer, hint, and score for Task ${task.number}?`)) {
      return;
    }
    state.fullMock = { status: "idle", deadline: null, endedReason: null };
    state.tasks[task.id] = defaultTaskState();
    persistState();
    renderAll();
    focusAfterRender("start-task-button");
    announce(`Task ${task.number} reset.`);
  }

  function startTask(task) {
    if (state.fullMock.status === "running") {
      return;
    }
    const running = individualRunningTask();
    if (running && running.id !== task.id) {
      window.alert(`Finish Task ${running.number} before starting another individual timer.`);
      return;
    }
    const taskState = state.tasks[task.id];
    taskState.status = "running";
    taskState.deadline = Date.now() + task.minutes * 60 * 1000;
    taskState.draft = "";
    taskState.rubric = [];
    taskState.hintUsed = false;
    state.fullMock = { status: "idle", deadline: null, endedReason: null };
    persistState();
    renderAll();
    focusAfterRender(`draft-${task.id}`);
    announce(`Task ${task.number} started. ${task.minutes} minutes remaining.`);
  }

  function revealTask(task, reason) {
    const taskState = state.tasks[task.id];
    const effectiveReason =
      reason !== "expired" && Number.isFinite(taskState.deadline) && taskState.deadline <= Date.now()
        ? "expired"
        : reason;
    taskState.status = "revealed";
    taskState.deadline = null;
    persistState();
    renderAll();
    if (effectiveReason === "expired") {
      timerStatus.textContent = "Time expired. The reference answer is now unlocked.";
      announce(`Time expired for Task ${task.number}. The reference answer is unlocked.`);
    } else {
      focusAfterRender("answer-heading");
      announce(`Task ${task.number} submitted. The reference answer is unlocked.`);
    }
  }

  function renderWorkspace() {
    workspace.replaceChildren();
    const task = taskById.get(state.activeTaskId);
    if (!task) {
      const placeholder = element("div", "workspace-placeholder");
      placeholder.appendChild(element("strong", "", "Choose a task"));
      placeholder.appendChild(element("span", "", "Select an assessment task from the list."));
      workspace.appendChild(placeholder);
      return;
    }
    const taskState = state.tasks[task.id];

    const header = element("header", "task-header");
    const title = element("div");
    title.appendChild(element("p", "eyebrow", `Task ${task.number} · ${task.difficulty}`));
    const taskHeading = element("h3", "", task.title);
    taskHeading.id = "task-heading";
    taskHeading.tabIndex = -1;
    title.appendChild(taskHeading);
    title.appendChild(element("p", "", task.summary));
    header.appendChild(title);
    const metrics = element("div", "task-metrics");
    metrics.appendChild(element("span", "badge kind", task.kind));
    metrics.appendChild(element("span", "badge", `${task.minutes} minutes`));
    metrics.appendChild(element("span", "badge", `${task.points} points`));
    header.appendChild(metrics);
    workspace.appendChild(header);

    const prompt = element("section", "prompt-box");
    prompt.appendChild(element("h4", "", "Scenario"));
    prompt.appendChild(element("p", "", task.scenario));
    workspace.appendChild(prompt);

    addHeading(workspace, "Deliverables", "h4");
    addList(workspace, task.instructions, "instruction-list");

    addHeading(workspace, "Starter code / responses", "h4");
    addCodeBlock(workspace, task.starterCode, "starter code");

    addHeading(workspace, "Visible checks", "h4");
    const testGrid = element("div", "test-grid");
    renderTests(testGrid, "Use before submission", task.visibleTests);
    const localPanel = element("section", "test-panel");
    localPanel.appendChild(element("h4", "", "Local verification"));
    localPanel.appendChild(
      element(
        "p",
        "",
        "Compile with C++20, warnings as errors, and add a sanitizer run where applicable. Record failing input, expected result, actual result, and the invariant each test covers."
      )
    );
    testGrid.appendChild(localPanel);
    workspace.appendChild(testGrid);

    const label = element("label", "draft-label");
    label.htmlFor = `draft-${task.id}`;
    label.appendChild(element("span", "", "Your answer / patch"));
    label.appendChild(
      element(
        "small",
        "",
        taskState.status === "running"
          ? "Saved locally as you type"
          : taskState.status === "revealed"
            ? "Read-only submission snapshot"
            : "Editable after the timer starts"
      )
    );
    workspace.appendChild(label);
    const draft = element("textarea", "draft");
    draft.id = `draft-${task.id}`;
    draft.spellcheck = false;
    draft.value = taskState.draft;
    draft.readOnly = taskState.status !== "running";
    draft.placeholder = "Verdict\n\nEvidence and failing case\n\nRepair / code\n\nTests\n\nComplexity, ownership, and synchronization tradeoffs";
    workspace.appendChild(draft);
    const draftStatus = element("p", "draft-status", `${taskState.draft.length} characters saved`);
    workspace.appendChild(draftStatus);
    draft.addEventListener("input", () => {
      if (expireDueTimers()) {
        return;
      }
      state.tasks[task.id].draft = draft.value;
      draftStatus.textContent = `${draft.value.length} characters saved`;
      persistState();
    });

    const actions = element("div", "workspace-actions");
    const note = element("p", "attempt-note");
    actions.appendChild(note);

    if (state.fullMock.status === "running") {
      note.textContent = "Full mock is running. Individual hints and submissions stay disabled until you end the mock or time expires.";
    } else if (taskState.status === "idle") {
      const running = individualRunningTask();
      note.textContent = running
        ? `Task ${running.number} is already timed. Finish it before starting another individual attempt.`
        : `The ${task.minutes}-minute clock uses an absolute deadline and continues if this tab is in the background.`;
      const start = element("button", "lab-button primary", `Start ${task.minutes}-minute task`);
      start.type = "button";
      start.id = "start-task-button";
      start.disabled = Boolean(running);
      start.addEventListener("click", () => startTask(task));
      actions.appendChild(start);
      const hint = element("button", "lab-button", `Hint (-${hintPenalty})`);
      hint.type = "button";
      hint.disabled = true;
      hint.title = "Start the timed task to unlock its hint.";
      actions.appendChild(hint);
    } else if (taskState.status === "running") {
      note.textContent = "Submit when your draft contains the verdict, evidence, repair, tests, and tradeoffs you want scored.";
      if (!taskState.hintUsed) {
        const hint = element("button", "lab-button", `Open hint (-${hintPenalty})`);
        hint.type = "button";
        hint.addEventListener("click", () => {
          if (expireDueTimers()) {
            return;
          }
          state.tasks[task.id].hintUsed = true;
          persistState();
          renderAll();
          focusAfterRender("hint-heading");
          announce(`Hint opened for Task ${task.number}. A ${hintPenalty}-point practice penalty will apply.`);
        });
        actions.appendChild(hint);
      }
      const submit = element("button", "lab-button primary", "End attempt & reveal answer");
      submit.type = "button";
      submit.addEventListener("click", () => {
        if (expireDueTimers()) {
          return;
        }
        if (window.confirm("End this timed attempt and unlock the reference answer?")) {
          revealTask(task, "submitted");
        }
      });
      actions.appendChild(submit);
      const reset = element("button", "lab-button warning", "Reset task");
      reset.type = "button";
      reset.addEventListener("click", () => resetTask(task));
      actions.appendChild(reset);
    } else {
      note.textContent = "Reference answer unlocked. Self-score only the criteria supported by your saved draft.";
      const reset = element("button", "lab-button", "Retry task from scratch");
      reset.type = "button";
      reset.addEventListener("click", () => resetTask(task));
      actions.appendChild(reset);
    }
    workspace.appendChild(actions);

    if (taskState.hintUsed && taskState.status !== "revealed") {
      const hintPanel = element("aside", "hint-panel");
      const hintHeading = element("h4", "", "Hint");
      hintHeading.id = "hint-heading";
      hintHeading.tabIndex = -1;
      hintPanel.appendChild(hintHeading);
      hintPanel.appendChild(element("p", "", task.hint));
      workspace.appendChild(hintPanel);
    }

    if (taskState.status === "revealed") {
      renderAnswer(workspace, task);
    } else {
      const locked = element("section", "locked-answer");
      locked.appendChild(element("strong", "", "Reference answer locked"));
      locked.appendChild(
        element(
          "p",
          "",
          state.fullMock.status === "running"
            ? "End the full mock or wait for the master timer to expire."
            : "Start and submit this timed attempt, or wait for its timer to expire."
        )
      );
      workspace.appendChild(locked);
    }
  }

  function formatDuration(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function finishFullMock(reason) {
    const effectiveReason =
      reason !== "expired" &&
      Number.isFinite(state.fullMock.deadline) &&
      state.fullMock.deadline <= Date.now()
        ? "expired"
        : reason;
    state.fullMock.status = "complete";
    state.fullMock.deadline = null;
    state.fullMock.endedReason = effectiveReason;
    for (const task of data.tasks) {
      state.tasks[task.id].status = "revealed";
      state.tasks[task.id].deadline = null;
    }
    persistState();
    renderAll();
    announce(
      effectiveReason === "expired"
        ? "The full mock timer expired. All reference answers are unlocked."
        : "The full mock was submitted. All reference answers are unlocked."
    );
  }

  function expireDueTimers() {
    const now = Date.now();
    if (state.fullMock.status === "running") {
      if (!Number.isFinite(state.fullMock.deadline) || state.fullMock.deadline <= now) {
        finishFullMock("expired");
        return true;
      }
      return false;
    }

    const expiredTasks = [];
    for (const task of data.tasks) {
      const taskState = state.tasks[task.id];
      if (
        taskState.status === "running" &&
        (!Number.isFinite(taskState.deadline) || taskState.deadline <= now)
      ) {
        taskState.status = "revealed";
        taskState.deadline = null;
        expiredTasks.push(task);
      }
    }
    if (expiredTasks.length > 0) {
      persistState();
      renderAll();
      announce(
        expiredTasks.length === 1
          ? `Time expired for Task ${expiredTasks[0].number}. The reference answer is unlocked.`
          : `${expiredTasks.length} task timers expired. Their reference answers are unlocked.`
      );
    }
    return expiredTasks.length > 0;
  }

  function updateTimerDisplay() {
    const task = taskById.get(state.activeTaskId);
    if (!task) {
      timerBar.dataset.state = "idle";
      timerKicker.textContent = "Selected task";
      timerDisplay.textContent = "00:00";
      timerStatus.textContent = "Choose a task and start when you are ready.";
      return;
    }

    if (state.fullMock.status === "running") {
      const remaining = state.fullMock.deadline - Date.now();
      timerKicker.textContent = `Full mock · Task ${task.number} of ${data.tasks.length}`;
      timerDisplay.textContent = formatDuration(remaining);
      timerStatus.textContent = "One master deadline; all reference answers remain locked.";
      timerBar.dataset.state = remaining <= 5 * 60 * 1000 ? "urgent" : "running";
      return;
    }

    if (state.fullMock.status === "complete") {
      timerKicker.textContent = "Full mock complete";
      timerDisplay.textContent = "00:00";
      timerStatus.textContent = state.fullMock.endedReason === "expired"
        ? "The master timer expired. All reference answers are unlocked."
        : "The mock was submitted. All reference answers are unlocked.";
      timerBar.dataset.state = "expired";
      return;
    }

    const running = individualRunningTask();
    if (running) {
      const runningState = state.tasks[running.id];
      const remaining = runningState.deadline - Date.now();
      timerKicker.textContent = `Task ${running.number} · ${running.points} points`;
      timerDisplay.textContent = formatDuration(remaining);
      timerStatus.textContent = running.id === task.id
        ? `${running.title} is in progress.`
        : `${running.title} is still running while you view Task ${task.number}.`;
      timerBar.dataset.state = remaining <= 2 * 60 * 1000 ? "urgent" : "running";
      return;
    }

    const taskState = state.tasks[task.id];
    timerKicker.textContent = `Task ${task.number} · ${task.points} points`;
    if (taskState.status === "running") {
      const remaining = taskState.deadline - Date.now();
      timerDisplay.textContent = formatDuration(remaining);
      timerStatus.textContent = `${task.title} is in progress.`;
      timerBar.dataset.state = remaining <= 2 * 60 * 1000 ? "urgent" : "running";
    } else if (taskState.status === "revealed") {
      timerDisplay.textContent = "00:00";
      timerBar.dataset.state = "expired";
      timerStatus.textContent = "Attempt complete. Reference answer and rubric are unlocked.";
    } else {
      timerDisplay.textContent = formatDuration(task.minutes * 60 * 1000);
      timerBar.dataset.state = "idle";
      timerStatus.textContent = `Ready for a ${task.minutes}-minute attempt.`;
    }
  }

  function renderGlobalControls() {
    const fullMockRunning = state.fullMock.status === "running";
    fullMockButton.textContent = fullMockRunning
      ? "End full mock & reveal all"
      : `Reset all & start ${data.mockMinutes}-minute mock`;
    fullMockButton.classList.toggle("warning", fullMockRunning);
    fullMockButton.classList.toggle("primary", !fullMockRunning);
    clearScoresButton.disabled = fullMockRunning;
  }

  function renderAll() {
    renderFilters();
    renderTaskList();
    renderWorkspace();
    renderScoreSummary();
    renderGlobalControls();
    updateTimerDisplay();
  }

  function startFullMock() {
    const hasSavedWork = data.tasks.some((task) => {
      const taskState = state.tasks[task.id];
      return taskState.draft.trim() || taskState.rubric.length || taskState.status !== "idle";
    });
    if (
      hasSavedWork &&
      !window.confirm("Start a new full mock? This clears every saved draft, timer, hint, and self-score in the lab.")
    ) {
      return;
    }
    const deadline = Date.now() + data.mockMinutes * 60 * 1000;
    state = defaultState();
    state.fullMock = { status: "running", deadline, endedReason: null };
    for (const task of data.tasks) {
      state.tasks[task.id].status = "running";
    }
    persistState();
    renderAll();
    focusAfterRender(`draft-${state.activeTaskId}`);
    announce(`Full mock started. ${data.mockMinutes} minutes remaining.`);
  }

  fullMockButton.addEventListener("click", () => {
    if (state.fullMock.status === "running") {
      if (expireDueTimers()) {
        return;
      }
      if (window.confirm("End the full mock now and unlock all reference answers?")) {
        finishFullMock("submitted");
      }
      return;
    }
    startFullMock();
  });

  clearScoresButton.addEventListener("click", () => {
    const hasScores = data.tasks.some((task) => state.tasks[task.id].rubric.length > 0);
    if (hasScores && !window.confirm("Clear every rubric checkbox while keeping drafts and attempt status?")) {
      return;
    }
    for (const task of data.tasks) {
      state.tasks[task.id].rubric = [];
    }
    persistState();
    renderAll();
  });

  for (const button of filterButtons) {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      const tasks = filteredTasks();
      if (tasks.length > 0 && !tasks.some((task) => task.id === state.activeTaskId)) {
        state.activeTaskId = tasks[0].id;
      }
      persistState();
      renderAll();
    });
  }

  if (!expireDueTimers()) {
    renderAll();
  }
  if (typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        expireDueTimers();
      }
    });
  }
  if (typeof window.addEventListener === "function") {
    window.addEventListener("pageshow", () => {
      expireDueTimers();
    });
  }
  window.setInterval(() => {
    if (!expireDueTimers()) {
      updateTimerDisplay();
    }
  }, 1000);
})();
