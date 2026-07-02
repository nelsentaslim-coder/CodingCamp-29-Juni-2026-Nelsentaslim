// ===== STORAGE MANAGER =====
const StorageManager = {
  getTasks() {
    try {
      const data = localStorage.getItem('dashboard_tasks');
      if (data === null) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveTasks(tasks) {
    try {
      localStorage.setItem('dashboard_tasks', JSON.stringify(tasks));
    } catch (e) {
      this.showToast('Gagal menyimpan data tugas: ' + e.message);
    }
  },

  getLinks() {
    try {
      const data = localStorage.getItem('dashboard_links');
      if (data === null) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveLinks(links) {
    try {
      localStorage.setItem('dashboard_links', JSON.stringify(links));
    } catch (e) {
      this.showToast('Gagal menyimpan data link: ' + e.message);
    }
  },

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
};

// ===== GREETING WIDGET =====
const GreetingWidget = {
  _namaHari: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  _namaBulan: [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ],

  getGreeting(hour) {
    if (hour >= 5 && hour < 12) return 'Selamat Pagi';
    if (hour >= 12 && hour < 18) return 'Selamat Siang';
    if (hour >= 18 && hour < 21) return 'Selamat Sore';
    return 'Selamat Malam';
  },

  render() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockStr = `${hours}:${minutes}`;

    const hari = this._namaHari[now.getDay()];
    const tanggal = now.getDate();
    const bulan = this._namaBulan[now.getMonth()];
    const tahun = now.getFullYear();
    const dateStr = `${hari}, ${tanggal} ${bulan} ${tahun}`;

    const greeting = this.getGreeting(now.getHours());

    document.getElementById('clock').textContent = clockStr;
    document.getElementById('date-text').textContent = dateStr;
    document.getElementById('greeting-text').textContent = greeting;
  },

  init() {
    this.render();
    setInterval(() => this.render(), 60000);
  }
};

// ===== FOCUS TIMER =====
const FocusTimer = {
  _state: {
    state: 'idle',
    secondsLeft: 1500,
    intervalId: null,
    isFinished: false
  },

  render() {
    const s = this._state;
    const mins = String(Math.floor(s.secondsLeft / 60)).padStart(2, '0');
    const secs = String(s.secondsLeft % 60).padStart(2, '0');
    document.getElementById('timer-display').textContent = `${mins}:${secs}`;

    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const timerFinished = document.getElementById('timer-finished');

    btnStart.disabled = (s.state === 'running');
    btnStop.disabled = (s.state !== 'running');

    if (s.isFinished) {
      timerFinished.classList.remove('hidden');
    } else {
      timerFinished.classList.add('hidden');
    }
  },

  tick() {
    const s = this._state;
    if (s.secondsLeft <= 0) {
      clearInterval(s.intervalId);
      s.intervalId = null;
      s.isFinished = true;
      s.state = 'idle';
      this.render();
      return;
    }
    s.secondsLeft -= 1;
    this.render();
  },

  start() {
    const s = this._state;
    if (s.state === 'running') return;
    s.state = 'running';
    s.intervalId = setInterval(() => this.tick(), 1000);
    this.render();
  },

  stop() {
    const s = this._state;
    if (s.state !== 'running') return;
    clearInterval(s.intervalId);
    s.intervalId = null;
    s.state = 'paused';
    this.render();
  },

  reset() {
    const s = this._state;
    clearInterval(s.intervalId);
    s.intervalId = null;
    s.secondsLeft = 1500;
    s.state = 'idle';
    s.isFinished = false;
    this.render();
  },

  init() {
    this.render();
    document.getElementById('btn-start').addEventListener('click', () => this.start());
    document.getElementById('btn-stop').addEventListener('click', () => this.stop());
    document.getElementById('btn-reset').addEventListener('click', () => this.reset());
  }
};

// ===== TODO LIST =====
const TodoList = {
  _tasks: [],
  _editingId: null,

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  renderItem(task) {
    const li = document.createElement('li');
    if (task.done) li.classList.add('task--done');
    li.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => this.toggleTask(task.id));

    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-edit';
    btnEdit.textContent = 'Edit';
    btnEdit.addEventListener('click', () => this._enterEditMode(li, task));

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-delete';
    btnDelete.textContent = '✕';
    btnDelete.setAttribute('aria-label', 'Hapus tugas');
    btnDelete.addEventListener('click', () => this.deleteTask(task.id));

    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(actions);

    return li;
  },

  _enterEditMode(li, task) {
    // Batalkan edit yang sedang aktif jika ada
    if (this._editingId !== null && this._editingId !== task.id) {
      const activeTask = this._tasks.find(t => t.id === this._editingId);
      if (activeTask) {
        const activeLi = document.querySelector(`#todo-list li[data-id="${this._editingId}"]`);
        if (activeLi) {
          const newLi = this.renderItem(activeTask);
          activeLi.replaceWith(newLi);
        }
      }
    }

    this._editingId = task.id;

    // Bersihkan isi li
    li.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = task.text;
    input.maxLength = 200;

    const errorSpan = document.createElement('span');
    errorSpan.className = 'task-edit-error hidden';
    errorSpan.textContent = 'Teks tugas tidak boleh kosong.';

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const btnSave = document.createElement('button');
    btnSave.className = 'btn-save';
    btnSave.textContent = 'Simpan';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-cancel';
    btnCancel.textContent = 'Batal';

    const save = () => {
      const newText = input.value.trim();
      if (!newText) {
        errorSpan.classList.remove('hidden');
        return;
      }
      this.editTask(task.id, newText);
    };

    const cancel = () => {
      this._editingId = null;
      const newLi = this.renderItem(task);
      li.replaceWith(newLi);
    };

    btnSave.addEventListener('click', save);
    btnCancel.addEventListener('click', cancel);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') cancel();
    });

    actions.appendChild(btnSave);
    actions.appendChild(btnCancel);

    li.appendChild(input);
    li.appendChild(errorSpan);
    li.appendChild(actions);

    input.focus();
    input.select();
  },

  renderList() {
    const ul = document.getElementById('todo-list');
    ul.innerHTML = '';
    this._tasks.forEach(task => {
      ul.appendChild(this.renderItem(task));
    });
  },

  addTask(text) {
    const trimmed = text.trim();
    const errorEl = document.getElementById('todo-error');

    if (!trimmed) {
      errorEl.textContent = 'Teks tugas tidak boleh kosong.';
      errorEl.classList.remove('hidden');
      return;
    }

    const task = {
      id: this._generateId(),
      text: trimmed.slice(0, 200),
      done: false,
      createdAt: Date.now()
    };

    this._tasks.push(task);
    StorageManager.saveTasks(this._tasks);
    this.renderList();
    document.getElementById('todo-input').value = '';
  },

  editTask(id, newText) {
    const idx = this._tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    this._tasks[idx].text = newText.trim().slice(0, 200);
    this._editingId = null;
    StorageManager.saveTasks(this._tasks);
    this.renderList();
  },

  toggleTask(id) {
    const task = this._tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    StorageManager.saveTasks(this._tasks);
    // Re-render item saja
    const li = document.querySelector(`#todo-list li[data-id="${id}"]`);
    if (li) {
      const newLi = this.renderItem(task);
      li.replaceWith(newLi);
    }
  },

  deleteTask(id) {
    this._tasks = this._tasks.filter(t => t.id !== id);
    StorageManager.saveTasks(this._tasks);
    this.renderList();
  },

  init() {
    this._tasks = StorageManager.getTasks();
    this.renderList();

    const input = document.getElementById('todo-input');
    const errorEl = document.getElementById('todo-error');

    document.getElementById('btn-add-task').addEventListener('click', () => {
      this.addTask(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addTask(input.value);
    });

    input.addEventListener('input', () => {
      if (!errorEl.classList.contains('hidden')) {
        errorEl.classList.add('hidden');
      }
    });
  }
};

// ===== QUICK LINKS =====
const QuickLinks = {
  _links: [],

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  renderItem(link) {
    const card = document.createElement('div');
    card.className = 'link-card';
    card.dataset.id = link.id;

    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.name;

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-delete';
    btnDelete.textContent = '✕';
    btnDelete.setAttribute('aria-label', 'Hapus link');
    btnDelete.addEventListener('click', (e) => {
      e.preventDefault();
      this.deleteLink(link.id);
    });

    card.appendChild(anchor);
    card.appendChild(btnDelete);

    return card;
  },

  renderLinks() {
    const container = document.getElementById('links-container');
    container.innerHTML = '';
    this._links.forEach(link => {
      container.appendChild(this.renderItem(link));
    });
  },

  addLink(name, url) {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    const errorEl = document.getElementById('link-error');

    // Validasi nama
    if (!trimmedName) {
      errorEl.textContent = 'Nama link tidak boleh kosong.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Validasi URL kosong
    if (!trimmedUrl) {
      errorEl.textContent = 'URL tidak boleh kosong.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Validasi format URL
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      errorEl.textContent = 'URL harus diawali dengan http:// atau https://';
      errorEl.classList.remove('hidden');
      return;
    }

    // Input valid — sembunyikan error
    errorEl.classList.add('hidden');

    const link = {
      id: this._generateId(),
      name: trimmedName.slice(0, 50),
      url: trimmedUrl.slice(0, 2048)
    };

    this._links.push(link);
    StorageManager.saveLinks(this._links);
    this.renderLinks();

    document.getElementById('link-name-input').value = '';
    document.getElementById('link-url-input').value = '';
  },

  deleteLink(id) {
    this._links = this._links.filter(l => l.id !== id);
    StorageManager.saveLinks(this._links);
    this.renderLinks();
  },

  init() {
    this._links = StorageManager.getLinks();
    this.renderLinks();

    document.getElementById('btn-add-link').addEventListener('click', () => {
      const name = document.getElementById('link-name-input').value;
      const url = document.getElementById('link-url-input').value;
      this.addLink(name, url);
    });
  }
};

// ===== INITIALIZATION =====
GreetingWidget.init();
FocusTimer.init();
TodoList.init();
QuickLinks.init();
