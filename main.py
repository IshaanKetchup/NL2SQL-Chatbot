from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import os
from fastapi.responses import HTMLResponse

# RUN IT USING uvicorn main:app --reload

# Load environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Validate API keys on startup
if not GEMINI_API_KEY:
    print("⚠️  Warning: GEMINI_API_KEY environment variable is not set")
if not GROQ_API_KEY:
    print("⚠️  Warning: GROQ_API_KEY environment variable is not set")

# Initialize Gemini client (only if API key is provided)
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    client = None
    print("⚠️  Gemini client disabled - no API key provided")

# Initialize Groq client (only if API key is provided)
if GROQ_API_KEY:
    grok = Groq(api_key=GROQ_API_KEY)
else:
    grok = None
    print("⚠️  Groq client disabled - no API key provided")

# FastAPI app
app = FastAPI()

# Allow frontend to access it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class QueryRequest(BaseModel):
    text: str

class SchemaUpdateRequest(BaseModel):
    schema: list  # now a list of {table, columns}

# Store schema as structured JSON
current_schema = [
    {"table": "users", "columns": ["id", "name", "email"]},
    {"table": "orders", "columns": ["id", "user_id", "total", "date"]},
]

@app.get("/", response_class=HTMLResponse)
async def serve_spiderman():
    """
    Serve the htrmldud.html file when the website loads.
    This is the root endpoint.
    """
    try:
        # Read the HTML file
        with open("index.html", "r", encoding="utf-8") as file:
            html_content = file.read()
        return HTMLResponse(content=html_content, status_code=200)
    except FileNotFoundError:
        # If file doesn't exist, return a simple message with instructions
        error_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Spiderman Page Not Found</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                    background-color: #f0f0f0;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    max-width: 600px;
                    margin: 0 auto;
                }
                h1 {
                    color: #ff0000;
                }
                code {
                    background: #f5f5f5;
                    padding: 5px;
                    border-radius: 3px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🕷️ Spiderman Page Not Found</h1>
                <p>The <code>spiderman.html</code> file was not found in the current directory.</p>
                <p>Please make sure:</p>
                <ol style="text-align: left; display: inline-block;">
                    <li>The <code>spiderman.html</code> file exists in the same directory as this Python file</li>
                    <li>You've spelled the filename correctly</li>
                    <li>You're running the server from the correct directory</li>
                </ol>
                <p>Current directory: <code>""" + os.getcwd() + """</code></p>
                <p>API endpoints are still available at:</p>
                <ul style="text-align: left; display: inline-block;">
                    <li><code>POST /nl-to-sql</code> - Convert natural language to SQL</li>
                    <li><code>POST /update-schema</code> - Update database schema</li>
                    <li><code>GET /get-schema</code> - Get current schema</li>
                </ul>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=404)

@app.post("/nl-to-sql")
def nl_to_sql(request: QueryRequest):
    # Convert JSON schema to text for Gemini
    schema_text = "\n".join(
        f"{t['table']}({', '.join(t['columns'])})" for t in current_schema
    )

    prompt = f"""
    You are a SQL generator. Follow these rules strictly:
1. ONLY use the schema provided below.
2. If the user request cannot be answered with the schema, reply ONLY with:
   "Error: Request cannot be answered with the current schema."
3. Do NOT suggest new tables, columns, or schemas.
4. Output ONLY the SQL query (or the error message).

    Schema:
    {schema_text}

    User request: "{request.text}"

    SQL:
    """

    try:
        # Try Gemini first
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        sql_text = response.text.strip()

    except Exception as e:
        # Fallback to Groq
        grok_response = grok.chat.completions.create(
            model="llama-3.3-70b-versatile",  # best SQL-performing model Groq provides
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )
        sql_text = grok_response.choices[0].message.content.strip()


    return {"sql": sql_text}


@app.post("/update-schema")
def update_schema(req: SchemaUpdateRequest):
    global current_schema
    current_schema = req.schema
    return {"message": "Schema updated successfully", "schema": current_schema}

@app.get("/get-schema")
def get_schema():
    return {"schema": current_schema}

