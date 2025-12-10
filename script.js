 // Backend API URL - Change this to your actual backend URL
    const BACKEND_URL = "https://nl2sql-chatbot.onrender.com"; //"'http://127.0.0.1:8000'"; // Default FastAPI port
    
    // Initialize feather icons
    feather.replace();
    
    // Global schema variable
    let schema = [];
    
    // DOM Elements
    const schemaWrapper = document.getElementById('schema-wrapper');
    const toggleBtn = document.getElementById('toggle-schema');
    const toggleIcon = document.getElementById('toggle-icon');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatContainer = document.getElementById('chat-container');
    const schemaBody = document.getElementById('schema-body');
    
    // Initialize - fetch schema from backend
    fetchSchemaFromBackend();
    
    // Initialize copy button for welcome message
    setTimeout(() => {
        initializeCopyButtons();
    }, 100);
    
    // Toggle schema panel
    let collapsed = false;
    toggleBtn.addEventListener('click', () => {
        collapsed = !collapsed;
        if(collapsed){
            schemaWrapper.style.width = '0px';
            schemaWrapper.style.minWidth = '0px';
            schemaWrapper.style.opacity = '0';
            schemaWrapper.style.padding = '0';
            schemaWrapper.style.overflow = 'hidden';
            toggleIcon.setAttribute('data-feather','chevron-right');
        } else {
            schemaWrapper.style.width = '';
            schemaWrapper.style.minWidth = '280px';
            schemaWrapper.style.opacity = '1';
            schemaWrapper.style.padding = '1rem';
            schemaWrapper.style.overflow = 'auto';
            toggleIcon.setAttribute('data-feather','chevron-left');
        }
        toggleIcon.outerHTML = feather.icons[ toggleIcon.getAttribute('data-feather') ].toSvg({ 
            'stroke': '#a3a3a3', 
            'class':'w-5 h-5' 
        });
        feather.replace();
    });
    
    // Handle input validation
    messageInput.addEventListener('input', () => {
        sendButton.disabled = messageInput.value.trim() === '';
    });
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageInput.value.trim() !== '') {
                sendMessage();
            }
        }
    });
    
    sendButton.addEventListener('click', sendMessage);
    
    // Clear chat
    document.getElementById('clear-chat').addEventListener('click', function() {
        chatContainer.innerHTML = `
            <div class="message bg-blue-900/20 chat-message p-4 max-w-[85%]">
                <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center">
                        <i data-feather="database" class="w-4 h-4 text-blue-300"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-blue-200 mb-1">SQL Assistant</p>
                        <div class="message-content">
                            <p class="text-neutral-300 mb-3">Hi! I can help you generate SQL queries based on your database schema. Ask me anything like "Show me all users" or "Find orders from last month".</p>
                            <div class="bg-neutral-900 rounded-lg p-3 border border-neutral-800 relative">
                                <button class="absolute right-2 top-2 icon-btn w-8 h-8 bg-neutral-800 hover:bg-neutral-700 copy-btn" data-sql="SELECT * FROM users 
WHERE email LIKE '%@example.com'
ORDER BY name ASC;">
                                    <i data-feather="copy" class="w-4 h-4"></i>
                                </button>
                                <pre class="text-sm font-mono text-neutral-200 overflow-x-auto"><code><span class="sql-keyword">SELECT</span> * <span class="sql-keyword">FROM</span> users 
<span class="sql-keyword">WHERE</span> email <span class="sql-keyword">LIKE</span> <span class="sql-string">'%@example.com'</span>
<span class="sql-keyword">ORDER BY</span> name <span class="sql-keyword">ASC</span>;</code></pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        feather.replace();
        
        // Reinitialize copy button
        setTimeout(() => {
            initializeCopyButtons();
        }, 100);
    });
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    });
    
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        themeToggle.checked = true;
    } else {
        document.documentElement.classList.remove('dark');
        themeToggle.checked = false;
    }
    
    // Backend API functions
    async function fetchSchemaFromBackend() {
        try {
            const response = await fetch(`${BACKEND_URL}/get-schema`);
            if (!response.ok) throw new Error('Failed to fetch schema');
            
            const data = await response.json();
            schema = data.schema || [];
            renderSchema();
        } catch (error) {
            console.error('Error fetching schema:', error);
            // Fallback to default schema
            schema = [
                {"table": "users", "columns": ["id", "name", "email"]},
                {"table": "orders", "columns": ["id", "user_id", "total", "date"]}
            ];
            renderSchema();
        }
    }
    
    async function saveSchemaToBackend() {
        try {
            const response = await fetch(`${BACKEND_URL}/update-schema`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ schema: schema })
            });
            
            if (!response.ok) throw new Error('Failed to save schema');
            
            const data = await response.json();
            showNotification('Schema saved to backend successfully!', 'success');
            return data;
        } catch (error) {
            console.error('Error saving schema:', error);
            showNotification('Failed to save schema to backend', 'error');
            // Save to localStorage as fallback
            localStorage.setItem('sql_schema', JSON.stringify(schema));
            showNotification('Schema saved to localStorage', 'warning');
        }
    }
    
    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessageToChat(message, 'user');
        messageInput.value = '';
        sendButton.disabled = true;
        
        try {
            // Show loading indicator
            const loadingId = addMessageToChat('Generating SQL query with AI...', 'assistant', true);
            
            // Call backend API
            const response = await fetch(`${BACKEND_URL}/nl-to-sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: message })
            });
            
            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }
            
            const data = await response.json();
            const sql = data.sql || 'No SQL generated';
            
            // Check for error message from backend
            if (sql.toLowerCase().includes('error:')) {
                updateMessageWithError(loadingId, sql);
            } else {
                updateMessageWithSQL(loadingId, sql);
            }
            
        } catch (error) {
            console.error('Error generating SQL:', error);
            updateMessageWithError(loadingId, `Error: ${error.message}. Please check if the backend server is running.`);
        }
    }
    
    // Schema rendering functions
    function renderSchema() {
        schemaBody.innerHTML = '';
        schema.forEach((table, tableIndex) => {
            const tableCard = document.createElement('div');
            tableCard.className = 'table-card';
            tableCard.innerHTML = `
                <div class="table-header" onclick="editTableName(${tableIndex}, this)">
                    <i data-feather="table" class="w-4 h-4 text-neutral-400"></i>
                    <div class="table-name-text">${table.table}</div>
                </div>
                <div class="space-y-1" id="columns-${tableIndex}">
                    ${table.columns.map((col, colIndex) => `
                        <div class="column-row">
                            <div class="flex items-center gap-2 flex-1" onclick="editColumnName(${tableIndex}, ${colIndex}, this)">
                                <span class="text-neutral-300 font-mono text-sm column-name-text">${col}</span>
                                <span class="text-xs text-neutral-500 px-1.5 py-0.5 bg-neutral-900 rounded">VARCHAR</span>
                            </div>
                            <button class="icon-btn w-6 h-6 hover:bg-red-900/20 hover:text-red-400" onclick="removeColumn(${tableIndex}, ${colIndex})">
                                <i data-feather="x" class="w-3 h-3"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-3 pt-3 border-t border-neutral-800 flex gap-2">
                    <button class="btn btn-secondary flex items-center gap-1 text-sm flex-1" onclick="addColumn(${tableIndex})">
                        <i data-feather="plus" class="w-3 h-3"></i>
                        Add Column
                    </button>
                    <button class="px-3 py-1.5 text-sm font-medium rounded-md text-red-400 hover:bg-red-900/20 border border-red-900/30 transition-colors" onclick="removeTable(${tableIndex})">
                        Remove
                    </button>
                </div>
            `;
            schemaBody.appendChild(tableCard);
        });
        feather.replace();
    }
    
    function editTableName(tableIndex, element) {
        const tableName = schema[tableIndex].table;
        const headerElement = element.closest('.table-header');
        const nameElement = headerElement.querySelector('.table-name-text');
        
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'table-name-input';
        input.value = tableName;
        
        // Replace text with input
        nameElement.replaceWith(input);
        input.focus();
        input.select();
        
        // Handle save on Enter or blur
        const saveName = () => {
            const newName = input.value.trim();
            if (newName && newName !== tableName) {
                schema[tableIndex].table = newName;
                saveSchemaToBackend();
                renderSchema();
            } else {
                renderSchema();
            }
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveName();
            } else if (e.key === 'Escape') {
                renderSchema();
            }
        });
        
        input.addEventListener('blur', saveName);
    }
    
    function editColumnName(tableIndex, columnIndex, element) {
        const columnName = schema[tableIndex].columns[columnIndex];
        const columnElement = element.querySelector('.column-name-text');
        
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'column-name-input';
        input.value = columnName;
        
        // Replace text with input
        columnElement.replaceWith(input);
        input.focus();
        input.select();
        
        // Handle save on Enter or blur
        const saveName = () => {
            const newName = input.value.trim();
            if (newName && newName !== columnName) {
                schema[tableIndex].columns[columnIndex] = newName;
                saveSchemaToBackend();
                renderSchema();
            } else {
                renderSchema();
            }
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveName();
            } else if (e.key === 'Escape') {
                renderSchema();
            }
        });
        
        input.addEventListener('blur', saveName);
    }
    
    function addTable() {
        const defaultName = `table_${schema.length + 1}`;
        schema.push({
            table: defaultName,
            columns: ["id", "name"]
        });
        saveSchemaToBackend();
        renderSchema();
        
        // After rendering, put the new table name in edit mode
        setTimeout(() => {
            const lastTableIndex = schema.length - 1;
            const lastTableHeader = document.querySelectorAll('.table-header')[lastTableIndex];
            if (lastTableHeader) {
                editTableName(lastTableIndex, lastTableHeader);
            }
        }, 100);
    }
    
    function removeTable(index) {
        if (confirm(`Are you sure you want to remove table "${schema[index].table}"?`)) {
            schema.splice(index, 1);
            saveSchemaToBackend();
            renderSchema();
        }
    }
    
    function addColumn(tableIndex) {
        const defaultName = `column_${schema[tableIndex].columns.length + 1}`;
        schema[tableIndex].columns.push(defaultName);
        saveSchemaToBackend();
        renderSchema();
        
        // After rendering, put the new column name in edit mode
        setTimeout(() => {
            const lastColumnIndex = schema[tableIndex].columns.length - 1;
            const lastColumnRow = document.querySelector(`#columns-${tableIndex} .column-row:last-child`);
            if (lastColumnRow) {
                editColumnName(tableIndex, lastColumnIndex, lastColumnRow);
            }
        }, 100);
    }
    
    function removeColumn(tableIndex, columnIndex) {
        const columnName = schema[tableIndex].columns[columnIndex];
        if (confirm(`Are you sure you want to remove column "${columnName}"?`)) {
            schema[tableIndex].columns.splice(columnIndex, 1);
            saveSchemaToBackend();
            renderSchema();
        }
    }
    
    function uploadSchema() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const newSchema = JSON.parse(event.target.result);
                    // Validate schema structure
                    if (Array.isArray(newSchema) && newSchema.every(t => t.table && Array.isArray(t.columns))) {
                        schema = newSchema;
                        await saveSchemaToBackend();
                        renderSchema();
                        showNotification('Schema imported successfully!', 'success');
                    } else {
                        throw new Error('Invalid schema format');
                    }
                } catch (err) {
                    showNotification('Invalid schema file format', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    // Chat functions
    function addMessageToChat(content, sender, isLoading = false) {
        const messageId = 'msg-' + Date.now();
        const messageDiv = document.createElement('div');
        
        if (sender === 'user') {
            messageDiv.className = 'message chat-message p-4 max-w-[85%] ml-auto bg-neutral-800 border-neutral-700 message-enter';
            messageDiv.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-neutral-100 mb-1">You</p>
                        <div class="message-content">
                            <p class="text-neutral-300">${escapeHtml(content)}</p>
                        </div>
                    </div>
                    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                        <i data-feather="user" class="w-4 h-4 text-neutral-300"></i>
                    </div>
                </div>
            `;
        } else {
            messageDiv.id = messageId;
            messageDiv.className = 'message bg-blue-900/20 chat-message p-4 max-w-[85%] message-enter';
            if (isLoading) {
                messageDiv.innerHTML = `
                    <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center">
                            <i data-feather="database" class="w-4 h-4 text-blue-300"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-blue-200 mb-1">SQL Assistant</p>
                            <div class="message-content">
                                <p class="text-neutral-300">${escapeHtml(content)}</p>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                messageDiv.innerHTML = `
                    <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center">
                            <i data-feather="database" class="w-4 h-4 text-blue-300"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-blue-200 mb-1">SQL Assistant</p>
                            <div class="message-content">
                                <p class="text-neutral-300 mb-3">${escapeHtml(content)}</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        chatContainer.appendChild(messageDiv);
        
        // Trigger animation
        setTimeout(() => {
            messageDiv.classList.add('message-enter-active');
        }, 10);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        feather.replace();
        return messageId;
    }
    
    function updateMessageWithSQL(messageId, sql) {
        const messageDiv = document.getElementById(messageId);
        if (messageDiv) {
            // Store clean SQL in a data attribute
            const cleanSQL = sql.replace(/<[^>]*>/g, '');
            
            messageDiv.querySelector('.message-content').innerHTML = `
                <p class="text-neutral-300 mb-3">Here's the SQL query generated by AI:</p>
                <div class="bg-neutral-900 rounded-lg p-3 border border-neutral-800 relative">
                    <button class="absolute right-2 top-2 icon-btn w-8 h-8 bg-neutral-800 hover:bg-neutral-700 copy-btn" data-sql="${escapeHtml(cleanSQL).replace(/"/g, '&quot;')}">
                        <i data-feather="copy" class="w-4 h-4"></i>
                    </button>
                    <pre class="text-sm font-mono text-neutral-200 overflow-x-auto"><code>${escapeHtml(sql)}</code></pre>
                </div>
            `;
            feather.replace();
            
            // Apply syntax highlighting
            const codeElement = messageDiv.querySelector('code');
            if (codeElement) {
                hljs.highlightElement(codeElement);
            }
            
            // Initialize copy button for this message
            initializeCopyButtonsForElement(messageDiv);
        }
    }
    
    function updateMessageWithError(messageId, errorMessage) {
        const messageDiv = document.getElementById(messageId);
        if (messageDiv) {
            messageDiv.querySelector('.message-content').innerHTML = `
                <div class="sql-error">
                    <p class="font-medium text-red-300 mb-1">⚠️ Error</p>
                    <p class="text-neutral-300">${escapeHtml(errorMessage)}</p>
                </div>
            `;
            feather.replace();
        }
    }
    
    // Copy button functions
    function initializeCopyButtons() {
        document.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const sql = this.getAttribute('data-sql');
                if (sql) {
                    copyToClipboard(sql, this);
                }
            });
        });
    }
    
    function initializeCopyButtonsForElement(element) {
        element.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const sql = this.getAttribute('data-sql');
                if (sql) {
                    copyToClipboard(sql, this);
                }
            });
        });
    }
    
    function copyToClipboard(text, button) {
        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        const cleanText = textarea.value;
        
        navigator.clipboard.writeText(cleanText).then(() => {
            const originalIcon = button.innerHTML;
            button.innerHTML = feather.icons.check.toSvg({ class: 'w-4 h-4 text-green-400' });
            button.classList.add('copy-success');
            
            setTimeout(() => {
                button.innerHTML = originalIcon;
                button.classList.remove('copy-success');
                feather.replace();
            }, 2000);
            
            showNotification('SQL copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = cleanText;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showNotification('SQL copied to clipboard!', 'success');
            } catch (e) {
                showNotification('Failed to copy to clipboard', 'error');
            }
            document.body.removeChild(textarea);
        });
    }
    
    function showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-900/90 border-green-700 text-green-100',
            error: 'bg-red-900/90 border-red-700 text-red-100',
            warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-100',
            info: 'bg-blue-900/90 border-blue-700 text-blue-100'
        };
        
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg border shadow-lg z-50 ${colors[type]}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Add hover animations to buttons
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.classList.add('animate-hover-lift');
        });
        btn.addEventListener('animationend', () => {
            btn.classList.remove('animate-hover-lift');
        });
    });
    
    // Test backend connection on load
    window.addEventListener('load', async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/get-schema`);
            if (response.ok) {
                console.log('Backend connection successful');
            }
        } catch (error) {
            console.warn('Backend not reachable. Running in offline mode.');
            showNotification('Backend not reachable. Using local schema.', 'warning');
        }
    });