const title = document.getElementById('title');
const create = document.getElementById('create');
const list = document.getElementById('list');
const modalElement = document.getElementById('deleteModal');

const search = document.getElementById('search');
const counter = document.getElementById('counter');
const filterBtns = document.querySelectorAll('[data-filter]');

document.querySelector('[data-filter="all"]').classList.add("active");
let currentFilter = 'all';

let noteIdToDelete = null; // id модального окна
let modal = new bootstrap.Modal(modalElement); // модальное окно

let editingElem = null; // id редактируемого элемента


let recBtn = document.getElementById("voiceBtnContainer");
let isFlag = false;

let dragId = null;
let targetId = null;


let elementUnderFinger;
let leMobile;

let idDrag;

let isTouchMoving = false;
let touchStartTime = 0;

const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;


let massive = JSON.parse(localStorage.getItem("saveKey")) || [
  { name: 'Dima', id: 1, status: true },
  { name: 'Masha', id: 2, status: false },
  { name: 'Daniil', id: 3, status: false },
  { name: 'Alex', id: 4, status: true }
];

let saveTimer;

function saveNotes() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem("saveKey", JSON.stringify(massive)), 500);
};

window.addEventListener('beforeunload', () => clearTimeout(saveTimer));


/*Редактирование - Дэкстоп*/
document.addEventListener('keydown', function (event) {
  if (event.key === 'Enter' && editingElem !== null) {
    event.preventDefault();

    const input = document.querySelector(`input[data-id="${editingElem}"]`);
    const elem = massive.find(item => item.id === editingElem);

    if (input && elem && input.value.trim()) {
      elem.name = input.value.trim();
      editingElem = null;
      saveNotes();
      render();
    }
  }
});


list.addEventListener("dblclick", function (event) {
  let id = Number(event.target.dataset.id);
  let type = event.target.dataset.type;

  if (type === "edit") {
    editingElem = id;
    render();
  }
});
/*Редактирование - Дэкстоп*/


/*Редактирование - Мобилка*/
list.addEventListener('touchstart', function (event) {
  if (event.target.closest('.drag-handle')) return;

  let id = Number(event.target.dataset.id);
  let type = event.target.dataset.type;

  if (type === "edit") {
    editingElem = id;
    render();
  }

}, { passive: true });

/*Редактирование - Мобилка*/
filterBtns.forEach((e) => {
  e.addEventListener("click", function () {
    filterBtns.forEach((del) => { del.classList.remove("active") });
    this.classList.add("active");
    currentFilter = this.dataset.filter;
    render();
  });
});


function returnHTML(elem) {
  let isEditing;
  isEditing = editingElem === elem.id;
  return `
    <li draggable="true" data-id="${elem.id}" class="list-group-item d-flex justify-content-between align-items-center">
      ${isEditing ?
      `<div class="d-flex w-100 align-items-center">
          <input type="text" data-id="${elem.id}" value="${elem.name}"
          class="form-control w-75 me-2">
        </div>` :
      `<span class="${elem.status ? "text-decoration-line-through" : "text-lowercase"}" data-id="${elem.id}" data-type="edit">${elem.name}</span>`
    }
      <span>
       ${!isEditing ? '' : `
        <button data-id="${elem.id}" data-type="save" class="btn btn__add">
            <i></i> Сохранить
        </button>`}
        <span data-id="${elem.id}" data-type="drag" class="btn btn-small btn-outline-secondary drag-handle" title="Перетащить">
          <i class="fas fa-arrows-alt"></i>
        </span>
        <span data-id="${elem.id}" data-type='toggle' class="btn btn-small btn-${elem.status ? "success" : "primary"}">&check;</span>
        <span data-id="${elem.id}" data-type='remove' class="btn btn-small btn-danger">&times;</span>
      </span>
    </li>`
};


// Изменение и Удаление кнопок
list.addEventListener("click", function (event) {
  let target = event.target.closest('[data-type]');
  if (!target) return;

  let id = Number(target.dataset.id);
  let type = target.dataset.type;

  console.log('Тип клика:', type, 'ID:', id);

  if (type === "toggle") {
    let note = massive.find(elem => elem.id === id);
    if (note) {
      note.status = !note.status;
      render();
      saveNotes();
    }
  } else if (type === "remove") {
    noteIdToDelete = id;
    if ('ontouchstart' in window) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (modal) {
      modal.show();
    }
  } else if (type === 'save') {
    const input = document.querySelector(`input[data-id="${id}"]`);
    const redactElem = massive.find(item => item.id === id);

    if (input && redactElem && input.value.trim()) {
      redactElem.name = input.value.trim();
      editingElem = null;
      saveNotes();
      render();
    }
  }
});


document.getElementById("confirmDelete").addEventListener("click", function () {
  if (noteIdToDelete !== null) {
    let li = document.querySelector(`li[data-id="${noteIdToDelete}"]`);
    li.classList.add("removing-vanish");

    setTimeout(() => {
      let not2 = massive.findIndex(elem => elem.id === noteIdToDelete);
      if (not2 !== -1) {
        massive.splice(not2, 1);
      }
      if (getFilteredNotes().length === 0) {
        filterBtns.forEach(btn =>
          btn.classList.remove('active'));
        filterBtns.forEach(btn => {
          if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
            currentFilter = 'all';
          };
        });
      };
      render();
      saveNotes();

      noteIdToDelete = null;
      modal.hide();
      document.getElementById("confirmDelete").blur();
    }, 200)
  }
});
// Изменение и Удаление кнопок


/*Перетаскивание Мобилка*/
let touchStartId = null;
let touchCurrentId = null;
let startElem = false;
let dataTime = null;
let lastHighlighted = null;
let draggedElement = null;

list.addEventListener('touchstart', function (event) {
  let btnDragging = event.target.closest('[data-type="drag"]');

  if (btnDragging) {
    let lielem = btnDragging.closest('li');
    draggedElement = lielem;
    startElem = true;
    dataTime = Date.now();
    touchStartId = Number(lielem.dataset.id);

    lielem.style.opacity = '0.7';
    event.preventDefault();
  }
}, { passive: false });

list.addEventListener('touchmove', function (event) {
  if (startElem) {
    let X = event.touches[0].clientX;
    let Y = event.touches[0].clientY;
    let underFinger = document.elementFromPoint(X, Y);

    if (underFinger) {
      let searchElem = underFinger.closest('li');

      if (lastHighlighted && lastHighlighted !== searchElem && lastHighlighted !== draggedElement) {
        lastHighlighted.style.backgroundColor = '';
      }

      if (searchElem && searchElem !== draggedElement) {
        searchElem.style.backgroundColor = "lightgray";
        lastHighlighted = searchElem;
        touchCurrentId = Number(searchElem.dataset.id);
      }
    }
    event.preventDefault();
  }
});

function clearHighlight() {
  if (lastHighlighted && lastHighlighted !== draggedElement) {
    lastHighlighted.style.backgroundColor = '';
  }
}

list.addEventListener('touchend', function () {
  if (startElem) {
    let endTime = Date.now();
    let difference = endTime - dataTime;

    if (difference > 400 && touchCurrentId) {
      let startIndex = massive.findIndex(item => item.id === touchStartId);
      let currentIndex = massive.findIndex(item => item.id === touchCurrentId);

      if (startIndex !== -1 && currentIndex !== -1 && startIndex !== currentIndex) {
        let exchange = massive[startIndex];
        massive[startIndex] = massive[currentIndex];
        massive[currentIndex] = exchange;
        render();
        saveNotes();
      }
    }

    if (draggedElement) {
      draggedElement.style.opacity = '';
    }
    clearHighlight();

    touchStartId = null;
    touchCurrentId = null;
    dataTime = null;
    lastHighlighted = null;
    draggedElement = null;
    startElem = false;
  }
});

/*Перетаскивание Мобилка*/
list.addEventListener('mousedown', function (event) {
  let btnDrag = event.target.closest('[data-type="drag"]');
  if (!btnDrag) return;

  let liDrag = btnDrag.closest('li[data-id]');
  if (!liDrag) return;

  idDrag = Number(liDrag.dataset.id);

  liDrag.setAttribute('draggable', 'true');
});

list.addEventListener('mouseup', function () {
  document.querySelectorAll('li[data-id]').forEach(li => {
    li.setAttribute('draggable', 'false');
  });
  idDrag = null;
});

list.addEventListener('dragstart', function (event) {
  if (!idDrag) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData('text/plain', idDrag);
});

list.addEventListener("dragover", (e) => e.preventDefault());

list.addEventListener("drop", function (event) {
  event.preventDefault();

  let liTarg = event.target.closest('li[data-id]');
  if (!liTarg || !idDrag) return;

  let idTarg = Number(liTarg.dataset.id);
  if (idDrag === idTarg) return;

  let indexDrag = massive.findIndex(item => item.id === idDrag);
  let indexTarg = massive.findIndex(item => item.id === idTarg);

  if (indexDrag !== -1 && indexTarg !== -1) {
    let rone = massive[indexDrag];
    massive[indexDrag] = massive[indexTarg];
    massive[indexTarg] = rone;

    render();
    saveNotes();
  }

  idDrag = null;
});
// Перетаскивание - Дэкстоп


// Кнопки Фильтрации + фильтрация поиска
function getFilteredNotes() {
  let resultFilter = massive;

  switch (currentFilter) {
    case "active":
      resultFilter = resultFilter.filter(e => !e.status);
      break;

    case "completed":
      resultFilter = resultFilter.filter(e => e.status);
      break;
  }

  let searchElements = search.value.trim().toLowerCase();
  if (searchElements) {
    resultFilter = resultFilter.filter(e => e.name.toLowerCase().includes(searchElements));
  }
  return resultFilter;
};

let searchTimer;
search.addEventListener("input", function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => render(), 100);
});
// Кнопки Фильтрации


// Счётчик
function updateCounter() {
  let total = massive.filter(e => e).length;
  let active = massive.filter(e => !e.status).length;
  let completed = massive.filter(e => e.status).length;

  counter.innerHTML = `
    <span class="badge bg-secondary me-1">Все: ${total}</span>
    <span class="badge bg-primary me-1">Активные: ${active}</span>
    <span class="badge bg-success">Выполненные: ${completed}</span>
  `;
}
// Счётчик


// Прогресбар
function calculateProgress() {
  let massiveBar = massive.length;
  let completed = massive.filter(e => e.status).length;
  let calc = Math.round((completed / massiveBar) * 100);

  let elemDar = document.getElementById("progressBar");

  if (calc === 0) {
    elemDar.style.width = `${calc}%`;
    elemDar.textContent = `Добавьте Задачу`;
    elemDar.style.background = `red`;
    return;
  }

  let background;
  if (calc < 35) {
    background = "red";
  } else if (calc < 70) {
    background = "blue";
  } else if (calc < 101) {
    background = "green";
  }

  elemDar.style.width = `${calc}%`;
  elemDar.textContent = ` ${completed} из ${massiveBar} `;
  elemDar.style.background = background;
}
// Прогресбар


// Добавление элемента
function AddsElement() {
  if (title.value.trim().length === 0) return;
  let titleValue = title.value.trim();

  let objj = {
    name: titleValue,
    id: Date.now(),
    status: false
  }

  massive.push(objj);
  title.value = '';

  render();
  saveNotes();
};


create.addEventListener('click', AddsElement);

title.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') AddsElement()
});
// Добавление элемента


// Перерисовка
function render() {
  let fragment = document.createDocumentFragment();
  let currenttMassive = getFilteredNotes();

  currenttMassive.forEach((e) => {
    let li = document.createElement('li');
    li.className = 'list-group-item justify-content-between align-items-center';
    li.dataset.id = e.id;
    li.innerHTML = returnHTML(e);
    fragment.appendChild(li);
  });

  list.innerHTML = "";
  list.appendChild(fragment);
  updateCounter();
  calculateProgress();

  if (editingElem !== null) {
    setTimeout(() => {
      const input = document.querySelector(`input[data-id="${editingElem}"]`);
      if (input) {
        input.focus();
        const length = input.value.length;
        input.setSelectionRange(length, length);
      }
    }, 0);
  }
}
render();
// Перерисовка











































