// Configuração inicial do IndexedDB
let db;
let currentEditId = null;

const openDB = () => {
  const request = indexedDB.open('TextEditorDB', 1);

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains('texts')) {
      const store = db.createObjectStore('texts', { keyPath: 'id', autoIncrement: true });
      store.createIndex('author', 'author', { unique: false });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    console.log('IndexedDB conectada com sucesso!');
    listSavedTexts();
  };

  request.onerror = (event) => {
    console.error('Erro ao conectar ao IndexedDB:', event.target.error);
  };
};

openDB();

// Função para formatar o conteúdo da psicografia
const formatPoetryContent = (lines) => {
  return lines.map(line => line.trim()).join('\n');
};

// Função para criar o card da psicografia com a nova lógica de autoria
const createPoetryCard = (title, author, content) => {
  // Div para a autoria
  let autoriaHTML = '<div class="poetry-author">';

  // Lógica para tratar o campo author
  if (author.includes('/')) {
    const [espirito, medium] = author.split('/').map(part => part.trim());
    if (espirito) {
      autoriaHTML += `<p>Por Espírito ${espirito}</p>`;
    }
    if (medium) {
      autoriaHTML += `<p>Psicografado pelo médium ${medium}</p>`;
    }
  } else {
    autoriaHTML += `<p>Por ${author}</p>`;
  }

  // Adiciona a data atual
  const agora = new Date();
  const dataFormatada = `${agora.getDate().toString().padStart(2, '0')}/${(agora.getMonth() + 1).toString().padStart(2, '0')}/${agora.getFullYear()} - ${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}h`;
  autoriaHTML += `<p>${dataFormatada}</p>`;
  autoriaHTML += '</div>';

  // Retorna o HTML completo do card
  return `
        <article class="poetry-card">
            <h2 class="poetry-title">${title}</h2>
            <p class="poetry-preview">${content}</p>
            ${autoriaHTML}
        </article>
    `;
};

//---------------------------------------------------------------------------------------------------

// Função para salvar no IndexedDB
const saveToIndexedDB = (data) => {
  if (!db) {
    console.error('Banco de dados não está conectado.');
    return;
  }

  const transaction = db.transaction(['texts'], 'readwrite');
  const store = transaction.objectStore('texts');

  const dataToSave = {
    title: data.title,
    content: data.content,
    category: data.category,
    author: data.author,
    timestamp: new Date()
  };

  if (currentEditId !== null) {
    dataToSave.id = currentEditId;
  }

  const request = currentEditId !== null ? store.put(dataToSave) : store.add(dataToSave);

  request.onsuccess = () => {
    console.log('Texto salvo/atualizado no IndexedDB com sucesso!');
    alert(currentEditId !== null ? 'Texto atualizado!' : 'Texto salvo no banco de dados!');
    currentEditId = null;
    listSavedTexts();
  };

  request.onerror = (event) => {
    console.error('Erro ao salvar/atualizar no IndexedDB:', event.target.error);
  };
};

// Função para listar textos salvos
const listSavedTexts = () => {
  if (!db) {
    console.error('Banco de dados não está conectado.');
    return;
  }

  const transaction = db.transaction(['texts'], 'readonly');
  const store = transaction.objectStore('texts');
  const request = store.getAll();

  request.onsuccess = () => {
    const savedTextsList = document.getElementById('savedTextsList');
    savedTextsList.innerHTML = '';

    request.result.forEach(item => {
      const li = document.createElement('li');
      li.classList.add('saved-text-item');
      li.textContent = `${item.title} | Autor: ${item.author} - ${formatTimestamp(item.timestamp)}`;
      li.addEventListener('click', () => loadTextForEditing(item));
      savedTextsList.appendChild(li);
    });
  };

  request.onerror = (event) => {
    console.error('Erro ao listar textos salvos:', event.target.error);
  };
};

// Função para formatar timestamp
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Função para carregar texto para edição
const loadTextForEditing = (item) => {
  document.getElementById('inputTitle').value = item.title;
  document.getElementById('inputText').value = item.content;
  document.getElementById('inputCategory').value = item.category;
  document.getElementById('inputAuthor').value = item.author;

  const outputArea = document.getElementById('outputArea');
  outputArea.innerHTML = createPoetryCard(item.title, item.author, item.content);
  outputArea.style.display = 'block';

  document.getElementById('selectedCategory').textContent = item.category;
  currentEditId = item.id;
};

// Função para limpar campos
const clearFields = () => {
  document.getElementById('inputTitle').value = '';
  document.getElementById('inputText').value = '';
  document.getElementById('inputCategory').value = '';
  document.getElementById('inputAuthor').value = '';

  const outputArea = document.getElementById('outputArea');
  outputArea.innerHTML = '';
  outputArea.style.display = 'none';

  document.getElementById('selectedCategory').textContent = '';
  currentEditId = null;

  console.log('Campos limpos com sucesso!');
};

// Evento do botão de converter/salvar
document.getElementById('convertBtn').addEventListener('click', () => {
  const inputTitle = document.getElementById('inputTitle').value.trim();
  const inputText = document.getElementById('inputText').value.trim();
  const inputCategory = document.getElementById('inputCategory').value.trim();
  const inputAuthor = document.getElementById('inputAuthor').value.trim();

  if (!inputTitle) {
    alert("Erro: O título não pode estar vazio.");
    return;
  }

  if (!inputText) {
    alert("Erro: O conteúdo não pode estar vazio.");
    return;
  }

  if (!inputCategory) {
    alert("Erro: Insira uma categoria antes de publicar o texto.");
    return;
  }

  if (!inputAuthor) {
    alert("Erro: Insira o nome do autor antes de publicar o texto.");
    return;
  }

  const lines = inputText.split('\n').filter(line => line.trim() !== '');
  const formattedContent = formatPoetryContent(lines);
  const htmlContent = createPoetryCard(inputTitle, inputAuthor, formattedContent);

  const outputArea = document.getElementById('outputArea');
  outputArea.innerHTML = htmlContent;
  outputArea.style.display = 'block';
  document.getElementById('selectedCategory').textContent = inputCategory;

  saveToIndexedDB({
    title: inputTitle,
    content: formattedContent,
    category: inputCategory,
    author: inputAuthor
  });
});

// Função para exportar dados como JSON
const exportData = () => {
  if (!db) {
    console.error('Banco de dados não está conectado.');
    return;
  }

  const transaction = db.transaction(['texts'], 'readonly');
  const store = transaction.objectStore('texts');
  const request = store.getAll();

  request.onsuccess = () => {
    const data = request.result;
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'psicografias.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Dados exportados com sucesso!');
  };

  request.onerror = (event) => {
    console.error('Erro ao exportar dados:', event.target.error);
  };
};

// Função para importar dados do JSON
const importData = (file) => {
  if (!db) {
    console.error('Banco de dados não está conectado.');
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {
    const data = JSON.parse(event.target.result);
    const transaction = db.transaction(['texts'], 'readwrite');
    const store = transaction.objectStore('texts');

    data.forEach(item => {
      const getRequest = store.get(item.id);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          store.put(item);
          console.log(`Item atualizado: ID ${item.id}`);
        } else {
          store.add(item);
          console.log(`Novo item adicionado: ID ${item.id}`);
        }
      };

      getRequest.onerror = () => {
        console.error(`Erro ao verificar existência do item ID ${item.id}`);
      };
    });

    transaction.oncomplete = () => {
      alert('Dados importados com sucesso!');
      listSavedTexts();
    };
  };

  reader.onerror = (event) => {
    console.error('Erro ao ler o arquivo:', event.target.error);
  };

  reader.readAsText(file);
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFields);
  } else {
    console.error("Erro: O botão #clearBtn não foi encontrado no DOM.");
  }

  document.getElementById('exportBtn').addEventListener('click', exportData);

  document.getElementById('importBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        importData(file);
      }
    };
    input.click();
  });
});