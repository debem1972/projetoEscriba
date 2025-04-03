// Configuração inicial do IndexedDB
let db;
let currentEditId = null;

// Abre e configura o IndexedDB
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

// Formata o conteúdo da psicografia em linhas
const formatPoetryContent = (lines) => {
  return lines.map(line => line.trim()).join('\n');
};

// Cria o HTML do card da psicografia
const createPoetryCard = (title, author, content) => {
  let autoriaHTML = '<div class="poetry-author">';
  if (author.includes('/')) {
    const [espirito, medium] = author.split('/').map(part => part.trim());
    if (espirito) autoriaHTML += `<p>Por Espírito ${espirito}</p>`;
    if (medium) autoriaHTML += `<p>Psicografado pelo médium ${medium}</p>`;
  } else {
    autoriaHTML += `<p>Por ${author}</p>`;
  }
  const agora = new Date();
  const dataFormatada = `${agora.getDate().toString().padStart(2, '0')}/${(agora.getMonth() + 1).toString().padStart(2, '0')}/${agora.getFullYear()} - ${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}h`;
  autoriaHTML += `<p>${dataFormatada}</p>`;
  autoriaHTML += '</div>';
  return `
        <article class="poetry-card">
            <h2 class="poetry-title">${title}</h2>
            <p class="poetry-preview">${content}</p>
            ${autoriaHTML}
        </article>
    `;
};

// Função para processar e converter links do Google Drive
const processGoogleDriveLink = (url) => {
  const drivePatterns = [
    /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/,
    /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /https:\/\/drive\.google\.com\/uc\?export=view&id=([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of drivePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const fileId = match[1];
      console.log(`Link do Google Drive detectado. ID extraído: ${fileId}`);
      return `https://drive.google.com/thumbnail?id=${fileId}`;
    }
  }

  console.log(`URL não é do Google Drive, mantendo original: ${url}`);
  return url;
};

// Função para validar o formato do telefone
const validatePhone = (phone) => {
  // Regex para validar telefone no formato (DD) 9XXXX-XXXX, onde DD é o DDD e o número começa com 9
  const phonePattern = /^\(\d{2}\)\s9\d{4}-\d{4}$/;
  return phonePattern.test(phone);
};

// Função para validar o formato do e-mail
const validateEmail = (email) => {
  // Regex simples para validar e-mail (nome@dominio.com)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

// Salva os dados no IndexedDB
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
    about: data.about || 'Sem informações sobre o médium.',
    mediumPhoto: data.mediumPhoto || '',
    mediumPhone: data.mediumPhone || '',
    mediumEmail: data.mediumEmail || '',
    timestamp: new Date()
  };

  if (currentEditId !== null) {
    dataToSave.id = currentEditId;
  }

  console.log('Dados a salvar:', dataToSave);

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

// Lista os textos salvos com filtro
const listSavedTexts = (filter = '') => {
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

    const texts = request.result;
    const filteredTexts = filter ? filterSavedTexts(texts, filter) : texts;

    if (filteredTexts.length === 0) {
      savedTextsList.innerHTML = '<li>Nenhum texto encontrado.</li>';
      return;
    }

    filteredTexts.forEach(item => {
      const li = document.createElement('li');
      li.classList.add('saved-text-item');

      const textSpan = document.createElement('span');
      textSpan.textContent = `${item.title} | Autor: ${item.author} - ${formatTimestamp(item.timestamp)}`;
      textSpan.style.cursor = 'pointer';
      textSpan.setAttribute('title', 'Para editar o texto clique aqui...');
      textSpan.addEventListener('click', () => loadTextForEditing(item));
      li.appendChild(textSpan);

      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.className = 'delete-btn';
      deleteBtn.title = 'Deletar texto';
      deleteBtn.addEventListener('click', () => deleteText(item.id));
      li.appendChild(deleteBtn);

      savedTextsList.appendChild(li);
    });
  };

  request.onerror = (event) => {
    console.error('Erro ao listar textos salvos:', event.target.error);
  };
};

// Filtra os textos salvos com base na busca
const filterSavedTexts = (texts, query) => {
  const trimmedQuery = query.trim().toLowerCase();

  return texts.filter(item => {
    const title = item.title.toLowerCase();
    const author = item.author.toLowerCase();
    const date = new Date(item.timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();

    if (title.includes(trimmedQuery) || author.includes(trimmedQuery)) {
      return true;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedQuery)) {
      const [qDay, qMonth, qYear] = trimmedQuery.split('/');
      return day === qDay && month === qMonth && year === qYear;
    } else if (/^\d{2}\/\d{4}$/.test(trimmedQuery)) {
      const [qMonth, qYear] = trimmedQuery.split('/');
      return month === qMonth && year === qYear;
    } else if (/^\d{4}$/.test(trimmedQuery)) {
      return year === trimmedQuery;
    }

    return false;
  });
};

// Deleta um texto do IndexedDB
const deleteText = (id) => {
  if (!db) {
    console.error('Banco de dados não está conectado.');
    return;
  }

  const confirmDelete = confirm('Tem certeza que deseja deletar este texto? Esta ação não pode ser desfeita.');
  if (!confirmDelete) return;

  const transaction = db.transaction(['texts'], 'readwrite');
  const store = transaction.objectStore('texts');
  const request = store.delete(id);

  request.onsuccess = () => {
    console.log(`Texto com ID ${id} deletado com sucesso!`);
    alert('Texto deletado com sucesso!');
    listSavedTexts(document.getElementById('searchSavedTexts').value);
  };

  request.onerror = (event) => {
    console.error('Erro ao deletar texto:', event.target.error);
    alert('Erro ao deletar o texto. Tente novamente.');
  };
};

// Formata o timestamp para exibição
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Carrega um texto para edição
const loadTextForEditing = (item) => {
  document.getElementById('inputTitle').value = item.title;
  document.getElementById('inputText').value = item.content;
  document.getElementById('inputCategory').value = item.category;
  document.getElementById('inputAuthor').value = item.author;
  document.getElementById('inputAbout').value = item.about || '';
  document.getElementById('inputMediumPhoto').value = item.mediumPhoto || '';
  document.getElementById('inputMediumPhone').value = item.mediumPhone || '';
  document.getElementById('inputMediumEmail').value = item.mediumEmail || '';

  const outputArea = document.getElementById('outputArea');
  outputArea.innerHTML = createPoetryCard(item.title, item.author, item.content);
  outputArea.style.display = 'block';

  document.getElementById('selectedCategory').textContent = item.category;
  currentEditId = item.id;
};

// Limpa os campos do formulário
const clearFields = () => {
  document.getElementById('inputTitle').value = '';
  document.getElementById('inputText').value = '';
  document.getElementById('inputCategory').value = '';
  document.getElementById('inputAuthor').value = '';
  document.getElementById('inputAbout').value = '';
  document.getElementById('inputMediumPhone').value = '';
  document.getElementById('inputMediumEmail').value = '';

  const outputArea = document.getElementById('outputArea');
  outputArea.innerHTML = '';
  outputArea.style.display = 'none';

  document.getElementById('selectedCategory').textContent = '';
  currentEditId = null;

  console.log('Campos limpos com sucesso!');
};

// Evento do botão de converter/salvar
document.getElementById('convertBtn').addEventListener('click', () => {
  // Captura os valores dos campos
  const inputTitle = document.getElementById('inputTitle').value.trim();
  const inputText = document.getElementById('inputText').value.trim();
  const inputCategory = document.getElementById('inputCategory').value.trim();
  const inputAuthor = document.getElementById('inputAuthor').value.trim();
  const inputAbout = document.getElementById('inputAbout').value.trim();
  let inputMediumPhoto = document.getElementById('inputMediumPhoto')?.value.trim() || '';
  const inputMediumPhone = document.getElementById('inputMediumPhone')?.value.trim() || '';
  const inputMediumEmail = document.getElementById('inputMediumEmail')?.value.trim() || '';

  // Validações básicas dos campos obrigatórios
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

  // Validação do telefone (opcional, mas se preenchido, deve estar no formato correto)
  if (inputMediumPhone && !validatePhone(inputMediumPhone)) {
    alert("Erro: O telefone deve estar no formato (DD) 9XXXX-XXXX, ex.: (11) 99999-9999.");
    return;
  }

  // Validação do e-mail (opcional, mas se preenchido, deve ser válido)
  if (inputMediumEmail && !validateEmail(inputMediumEmail)) {
    alert("Erro: O e-mail inserido não é válido. Use o formato exemplo@dominio.com.");
    return;
  }

  // Processa o link do Google Drive, se houver
  if (inputMediumPhoto) {
    inputMediumPhoto = processGoogleDriveLink(inputMediumPhoto);
  }

  // Formata o conteúdo e cria o card
  const lines = inputText.split('\n').filter(line => line.trim() !== '');
  const formattedContent = formatPoetryContent(lines);
  const htmlContent = createPoetryCard(inputTitle, inputAuthor, formattedContent);

  // Exibe o card na área de saída
  const outputArea = document.getElementById('outputArea');
  outputArea.innerHTML = htmlContent;
  outputArea.style.display = 'block';
  document.getElementById('selectedCategory').textContent = inputCategory;

  // Prepara os dados para salvar
  const dataToSave = {
    title: inputTitle,
    content: formattedContent,
    category: inputCategory,
    author: inputAuthor,
    about: inputAbout,
    mediumPhoto: inputMediumPhoto,
    mediumPhone: inputMediumPhone,
    mediumEmail: inputMediumEmail
  };

  console.log('Dados a salvar antes de enviar ao IndexedDB:', dataToSave);
  saveToIndexedDB(dataToSave);
});

// Exporta os dados como JSON
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

// Importa dados de um arquivo JSON
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

// Configura os eventos ao carregar a página
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

  document.getElementById('searchSavedTexts').addEventListener('input', (e) => {
    const query = e.target.value;
    listSavedTexts(query);
  });
});