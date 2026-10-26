// Node.js Express 백엔드 API 주소
const API_BASE_URL = 'http://localhost:5000/api/todos';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const countEl = document.getElementById('todo-count');
const submitButton = form.querySelector("button[type='submit']");

let todos = [];

// [1] 할 일 목록 가져오기 (GET)
async function fetchTodos() {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error(`서버 응답 오류 (${response.status})`);
    }
    const result = await response.json();
    todos = result.data || [];
    render();
  } catch (error) {
    showError('할 일 목록을 불러오지 못했습니다.', error);
  }
}

// [2] 할 일 추가하기 (POST)
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) return;

  submitButton.disabled = true;

  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || '할 일 추가 실패');
    }

    input.value = '';
    input.focus();
    await fetchTodos(); // 최신 목록 새로고침
  } catch (error) {
    showError('할 일을 추가하지 못했습니다.', error);
  } finally {
    submitButton.disabled = false;
  }
});

// [3] 목록 내 버튼 클릭 처리 (삭제 / 수정 / 저장 / 취소)
list.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const item = button.closest('.todo-item');
  const id = item.dataset.id;
  const action = button.dataset.action;

  // 삭제 (DELETE)
  if (action === 'delete') {
    if (!confirm('이 할 일을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('할 일 삭제에 실패했습니다.');
      }

      await fetchTodos();
    } catch (error) {
      showError('삭제 중 오류가 발생했습니다.', error);
    }
    return;
  }

  // 수정 모드 진입
  if (action === 'edit') {
    startEdit(item, id);
  }

  // 수정 내용 저장 (PUT)
  if (action === 'save') {
    const nextTitle = item.querySelector('.edit-input').value.trim();
    if (!nextTitle) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: nextTitle }),
      });

      if (!response.ok) {
        throw new Error('할 일 수정 저장에 실패했습니다.');
      }

      await fetchTodos();
    } catch (error) {
      showError('수정 중 오류가 발생했습니다.', error);
    }
  }

  // 수정 취소
  if (action === 'cancel') {
    render();
  }
});

// [4] 완료 체크박스 토글 (PUT)
list.addEventListener('change', async (event) => {
  const checkbox = event.target.closest("input[type='checkbox']");
  if (!checkbox) return;

  const item = checkbox.closest('.todo-item');
  const id = item.dataset.id;
  const completed = checkbox.checked;

  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ completed }),
    });

    if (!response.ok) {
      throw new Error('완료 상태 변경 실패');
    }

    await fetchTodos();
  } catch (error) {
    checkbox.checked = !completed; // 실패 시 체크박스 롤백
    showError('상태 변경 중 오류가 발생했습니다.', error);
  }
});

// [5] 인라인 수정 모드 UI
function startEdit(item, id) {
  const todo = todos.find((entry) => entry._id === id);
  if (!todo) return;

  item.classList.add('editing');
  item.querySelector('.title').outerHTML = `
    <input class="edit-input" type="text" maxlength="120" value="${escapeAttr(todo.title)}" />
  `;
  item.querySelector('.actions').innerHTML = `
    <button type="button" data-action="save">저장</button>
    <button type="button" data-action="cancel">취소</button>
  `;
  const editInput = item.querySelector('.edit-input');
  editInput.focus();
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);

  editInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      item.querySelector('[data-action="save"]').click();
    }
    if (event.key === 'Escape') {
      render();
    }
  });
}

// [6] 화면 렌더링
function render() {
  list.innerHTML = todos
    .map(
      (todo) => `
        <li class="todo-item ${todo.completed ? 'done' : ''}" data-id="${todo._id}">
          <input type="checkbox" ${todo.completed ? 'checked' : ''} aria-label="완료" />
          <p class="title">${escapeHtml(todo.title)}</p>
          <div class="actions">
            <button type="button" data-action="edit">수정</button>
            <button type="button" class="danger" data-action="delete">삭제</button>
          </div>
        </li>
      `
    )
    .join('');

  emptyState.classList.toggle('visible', todos.length === 0);
  countEl.textContent = `${todos.length}개`;
}

// [7] 에러 안내
function showError(message, error) {
  console.error(message, error);
  alert(`${message}\n\n※ 백엔드 서버(http://localhost:5000)가 실행 중인지 확인해주세요.`);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

// 첫 로딩 시 할 일 목록 가져오기 실행
fetchTodos();
