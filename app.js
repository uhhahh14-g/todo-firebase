import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJloUgYrvZ7-AciCXCoAKxda9Ww7WQ9Zc",
  authDomain: "todo-firebase-99bd5.firebaseapp.com",
  projectId: "todo-firebase-99bd5",
  storageBucket: "todo-firebase-99bd5.firebasestorage.app",
  messagingSenderId: "727550147592",
  appId: "1:727550147592:web:d0ab9538305e697f9ce5bd",
  databaseURL: "https://todo-firebase-99bd5-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const todosRef = ref(database, "todos");

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");
const countEl = document.getElementById("todo-count");
const submitButton = form.querySelector("button[type='submit']");

let todos = [];

onValue(
  todosRef,
  (snapshot) => {
    const data = snapshot.val() || {};
    todos = Object.entries(data)
      .map(([id, todo]) => ({ id, ...todo }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    render();
  },
  (error) => {
    showDatabaseError(error);
  }
);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;

  submitButton.disabled = true;

  try {
    const newTodoRef = push(todosRef);
    const todo = {
      title,
      done: false,
      createdAt: Date.now(),
    };

    await set(newTodoRef, todo);
    input.value = "";
    input.focus();
  } catch (error) {
    showDatabaseError(error);
  } finally {
    submitButton.disabled = false;
  }
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = button.closest(".todo-item");
  const id = item.dataset.id;
  const action = button.dataset.action;

  if (action === "delete") {
    try {
      await remove(ref(database, `todos/${id}`));
    } catch (error) {
      showDatabaseError(error);
    }
    return;
  }

  if (action === "edit") {
    startEdit(item, id);
  }

  if (action === "save") {
    const nextTitle = item.querySelector(".edit-input").value.trim();
    if (!nextTitle) return;
    try {
      await update(ref(database, `todos/${id}`), { title: nextTitle });
    } catch (error) {
      showDatabaseError(error);
    }
  }

  if (action === "cancel") {
    render();
  }
});

list.addEventListener("change", async (event) => {
  const checkbox = event.target.closest("input[type='checkbox']");
  if (!checkbox) return;
  const id = checkbox.closest(".todo-item").dataset.id;
  try {
    await update(ref(database, `todos/${id}`), {
      done: checkbox.checked,
    });
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    showDatabaseError(error);
  }
});

function startEdit(item, id) {
  const todo = todos.find((entry) => entry.id === id);
  item.classList.add("editing");
  item.querySelector(".title").outerHTML = `
    <input class="edit-input" type="text" maxlength="120" value="${escapeAttr(todo.title)}" />
  `;
  item.querySelector(".actions").innerHTML = `
    <button type="button" data-action="save">저장</button>
    <button type="button" data-action="cancel">취소</button>
  `;
  const editInput = item.querySelector(".edit-input");
  editInput.focus();
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);

  editInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      item.querySelector('[data-action="save"]').click();
    }
    if (event.key === "Escape") {
      render();
    }
  });
}

function render() {
  list.innerHTML = todos
    .map(
      (todo) => `
        <li class="todo-item ${todo.done ? "done" : ""}" data-id="${todo.id}">
          <input type="checkbox" ${todo.done ? "checked" : ""} aria-label="완료" />
          <p class="title">${escapeHtml(todo.title)}</p>
          <div class="actions">
            <button type="button" data-action="edit">수정</button>
            <button type="button" class="danger" data-action="delete">삭제</button>
          </div>
        </li>
      `
    )
    .join("");

  emptyState.classList.toggle("visible", todos.length === 0);
  countEl.textContent = `${todos.length}개`;
}

function showDatabaseError(error) {
  console.error("Firebase Realtime Database 오류:", error);
  alert(`Firebase 오류: ${error.message}`);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
