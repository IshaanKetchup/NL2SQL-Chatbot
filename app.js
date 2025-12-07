feather.replace();

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = localStorage.getItem('theme') || (prefersDarkScheme.matches ? 'dark' : 'light');
if (currentTheme === 'dark') { document.body.classList.add('dark'); themeToggle.checked = true; }
themeToggle.addEventListener('change', function() {
    if (this.checked) { document.body.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.body.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
    feather.replace();
});

// Chat logic
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const clearChatButton = document.getElementById('clear-chat');
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

function renderChatHistory() {
    chatContainer.innerHTML = '';
    chatHistory.forEach(msg => addMessage(msg.role, msg.content, false));
    scrollToBottom();
}

function addMessage(role, content, saveToHistory = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role==='user'?'bg-blue-50 dark:bg-blue-900/30 ml-auto':'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'} rounded-lg p-4 max-w-[80%] message-enter`;
    const icon = role==='user'?'user':'database';
    const name = role==='user'?'You':'SQL Assistant';
    messageDiv.innerHTML = `
        <div class="flex items-start space-x-2">
            <div class="flex-shrink-0 ${role==='user'?'bg-blue-500':'bg-gray-500'} text-white rounded-full p-2">
                <i data-feather="${icon}"></i>
            </div>
            <div class="flex-1">
                <p class="font-medium ${role==='user'?'text-blue-800 dark:text-blue-200':'text-gray-800 dark:text-gray-200'}">${name}</p>
                <div class="message-content text-gray-800 dark:text-gray-200 mt-1">${content}</div>
            </div>
        </div>
    `;
    chatContainer.appendChild(messageDiv);
    setTimeout(()=>{messageDiv.classList.add('message-enter-active');}, 10);

    setTimeout(()=>{
        const codeBlocks = messageDiv.querySelectorAll('pre code');
        codeBlocks.forEach(block=>{
            hljs.highlightElement(block);
            if(block.classList.contains('language-sql')){
                const copyButton = document.createElement('button');
                copyButton.className='copy-btn absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-1 text-xs';
                copyButton.innerHTML='<i data-feather="copy"></i>';
                copyButton.title='Copy to clipboard';
                const pre = block.parentElement;
                pre.style.position='relative';
                pre.appendChild(copyButton);
                copyButton.addEventListener('click', ()=>{
                    navigator.clipboard.writeText(block.textContent);
                    copyButton.innerHTML='<i data-feather="check"></i>';
                    setTimeout(()=>{copyButton.innerHTML='<i data-feather="copy"></i>';},2000);
                });
            }
        });
        feather.replace();
    },100);

    if(saveToHistory){
        chatHistory.push({role, content});
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
    scrollToBottom();
}

function scrollToBottom(){ chatContainer.scrollTop=chatContainer.scrollHeight; }

async function sendMessage(){
    const message=messageInput.value.trim();
    if(!message) return;
    addMessage('user',message);
    messageInput.value='';
    sendButton.disabled=true;

    const loadingId='loading-'+Date.now();
    const loadingDiv=document.createElement('div');
    loadingDiv.id=loadingId;
    loadingDiv.className='message bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-w-[80%] message-enter';
    loadingDiv.innerHTML=`
        <div class="flex items-start space-x-2">
            <div class="flex-shrink-0 bg-gray-500 text-white rounded-full p-2">
                <i data-feather="database"></i>
            </div>
            <div class="flex-1">
                <p class="font-medium text-gray-800 dark:text-gray-200">SQL Assistant</p>
                <div class="flex space-x-2 mt-1">
                    <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay:0.2s"></div>
                    <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay:0.4s"></div>
                </div>
            </div>
        </div>
    `;
    chatContainer.appendChild(loadingDiv);
    setTimeout(()=>{loadingDiv.classList.add('message-enter-active');},10);

    try{
        const response=await fetch('http://localhost:8000/nl-to-sql',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({text:message})
        });
        if(!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data=await response.json();
        const formattedSQL=`<pre><code class="language-sql">${data.sql}</code></pre>`;
        addMessage('assistant', formattedSQL);
    } catch(err){ addMessage('assistant',`Error: ${err.message}`); }
    finally{
        const loadingElement=document.getElementById(loadingId);
        if(loadingElement){
            loadingElement.classList.remove('message-enter-active');
            loadingElement.classList.add('opacity-0','transition-opacity','duration-300');
            setTimeout(()=>{loadingElement.remove();},300);
        }
        sendButton.disabled=false;
    }
}

sendButton.addEventListener('click',sendMessage);
messageInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); } });
messageInput.addEventListener('input',()=>{ sendButton.disabled=messageInput.value.trim()===''; });
clearChatButton.addEventListener('click',()=>{ if(confirm('Are you sure you want to clear the chat history?')){ chatHistory=[]; localStorage.removeItem('chatHistory'); renderChatHistory(); } });

let schemaData = [];

// Render schema table from schemaData
function renderSchema() {
  const body = document.getElementById("schema-body");
  body.innerHTML = "";
  schemaData.forEach((t, tableIndex) => {
    const row = document.createElement("tr");

    // Table name cell
    const tableCell = document.createElement("td");
    tableCell.className = "border p-2";
    tableCell.innerHTML = `<input type="text" value="${t.table}" 
                             onchange="updateTableName(${tableIndex}, this.value)" 
                             class="border rounded p-1 w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200"/>`;
    row.appendChild(tableCell);

    // Columns cell
    const colsCell = document.createElement("td");
    colsCell.className = "border p-2";
    colsCell.innerHTML = t.columns.map((c, colIndex) =>
      `<div class="flex items-center space-x-2 mb-1">
        <input type="text" value="${c}" 
               onchange="updateColumn(${tableIndex}, ${colIndex}, this.value)" 
               class="border rounded p-1 w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200"/>
        <button onclick="removeColumn(${tableIndex}, ${colIndex})" class="text-red-500">✖</button>
      </div>`
    ).join("") + `<button onclick="addColumn(${tableIndex})" class="text-blue-500">+ Add Column</button>`;
    row.appendChild(colsCell);

    // Actions cell
    const actionsCell = document.createElement("td");
    actionsCell.className = "border p-2 text-center";
    actionsCell.innerHTML = `<button onclick="removeTable(${tableIndex})" class="text-red-600">🗑 Remove</button>`;
    row.appendChild(actionsCell);

    body.appendChild(row);
  });
}

function addTable() {
  schemaData.push({ table: "new_table", columns: [] });
  renderSchema();
}

function removeTable(index) {
  schemaData.splice(index, 1);
  renderSchema();
}

function updateTableName(index, name) {
  schemaData[index].table = name;
}

function addColumn(tableIndex) {
  schemaData[tableIndex].columns.push("new_column");
  renderSchema();
}

function removeColumn(tableIndex, colIndex) {
  schemaData[tableIndex].columns.splice(colIndex, 1);
  renderSchema();
}

function updateColumn(tableIndex, colIndex, value) {
  schemaData[tableIndex].columns[colIndex] = value;
}

// Fetch schema from backend and populate UI
async function loadSchema() {
  try {
    const res = await fetch("http://127.0.0.1:8000/get-schema");
    const data = await res.json();
    schemaData = data.schema; // backend now returns JSON
    renderSchema();
  } catch (err) {
    console.error("Failed to load schema:", err);
  }
}

// Save schema to backend
async function saveSchema() {
  try {
    await fetch("http://127.0.0.1:8000/update-schema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema: schemaData })
    });
    alert("Schema saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to update schema.");
  }
}

function toggleSchema() {
    const section = document.getElementById('schema-section');
    const icon = document.getElementById('toggle-icon');
    section.classList.toggle('hidden');
    icon.textContent = section.classList.contains('hidden') ? '▼' : '▲';
}


// Initial load
renderChatHistory();
loadSchema();
messageInput.focus();

