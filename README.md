# Editor de Código — id_alunos

Aplicação Flask que serve um editor de código (Monaco Editor) no navegador e executa código Python no servidor via HTTPS. Roda em rede local na porta `8850`.

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instalar o `mkcert` (gerador dos arquivos `.pem`)](#2-instalar-o-mkcert-gerador-dos-arquivos-pem)
3. [Gerar os certificados `cert.pem` e `key.pem`](#3-gerar-os-certificados-certpem-e-keypem)
4. [Preparar o ambiente Python](#4-preparar-o-ambiente-python)
5. [Baixar o Monaco Editor (offline)](#5-baixar-o-monaco-editor-offline)
6. [Executar o servidor](#6-executar-o-servidor)
7. [Acessar pelo navegador](#7-acessar-pelo-navegador)
8. [Solução de problemas](#8-solução-de-problemas)

---

## 1. Pré-requisitos

- **Windows 10/11**
- **Python 3.10+** instalado e disponível no `PATH`
- **Acesso de administrador** ao `cmd` ou `PowerShell` (necessário para instalar o `mkcert` e o certificado raiz)

Confira a versão do Python:

```cmd
python --version
```

---

## 2. Instalar o `mkcert` (gerador dos arquivos `.pem`)

O `mkcert` é o programa que cria os certificados SSL locais (`key.pem` e `cert.pem`) confiáveis pelo navegador, sem aviso de "site inseguro".

### Opção A — Instalar via **Chocolatey** (recomendado)

Se você ainda não tem o Chocolatey, abra o **cmd como administrador** e execute:

```cmd
@"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
```

Feche e reabra o `cmd` como administrador, depois instale o `mkcert`:

```cmd
choco install mkcert -y
```

### Opção B — Instalar via **Scoop**

No `PowerShell`:

```powershell
scoop bucket add extras
scoop install mkcert
```

### Opção C — Instalar via **Winget** (Windows 11)

```cmd
winget install FiloSottile.mkcert
```

### Confirmar a instalação

```cmd
mkcert -version
```

---

## 3. Gerar os certificados `cert.pem` e `key.pem`

### Passo 3.1 — Instalar a autoridade certificadora local

Execute **uma única vez** no `cmd` (como administrador):

```cmd
mkcert -install
```

Esse comando registra o certificado raiz do `mkcert` no Windows para que o navegador confie nos certificados gerados.

### Passo 3.2 — Descobrir o IP da sua máquina na rede local

```cmd
ipconfig
```

Procure o "Endereço IPv4" do seu adaptador de rede (ex.: `192.168.31.156`).

### Passo 3.3 — Gerar os arquivos `.pem`

Entre na pasta do projeto e rode:

```cmd
cd LOCAL DO PROJEOTO\id_alunos
mkcert 192.168.31.156 localhost 127.0.0.1
```

> Substitua `192.168.31.156` pelo IP que apareceu no `ipconfig`.

Isso vai criar **dois arquivos** na pasta do projeto:

- `192.168.31.156+2.pem` — certificado público
- `192.168.31.156+2-key.pem` — chave privada

> O `+2` no nome significa "mais 2 hosts adicionais" (`localhost` e `127.0.0.1`).

### Passo 3.4 — Confirmar os nomes no `app.py`

O arquivo [app.py](app.py#L29-L30) está configurado para usar exatamente esses dois nomes:

```python
ssl_context=('192.168.31.156+2.pem', '192.168.31.156+2-key.pem')
```

Se o IP da sua máquina for **diferente** de `192.168.31.156`, edite [app.py](app.py) trocando esses dois nomes pelos arquivos que o `mkcert` gerou.

---

## 4. Preparar o ambiente Python

Crie e ative o ambiente virtual:

```cmd
cd LOCAL DO PROJETO\python\id_alunos
python -m venv venv
venv\Scripts\activate
```

Instale as dependências:

```cmd
pip install flask
```

---

## 5. Baixar o Monaco Editor (offline)

O editor visual é baixado uma única vez pelo script [baixar_monaco.py](baixar_monaco.py):

```cmd
python baixar_monaco.py
```

Os arquivos vão para [static/vs/](static/vs/) e o app passa a funcionar **sem internet**.

---

## 6. Executar o servidor

Com o `venv` ativado:

```cmd
python app.py
```

A saída esperada:

```
 * Running on https://192.168.31.156:8850
```

---

## 7. Acessar pelo navegador

- Na própria máquina: `https://localhost:8850`
- Em outro dispositivo da mesma rede (celular, outro PC): `https://192.168.31.156:8850`

> O navegador **não vai mostrar aviso de segurança** porque o `mkcert -install` registrou o certificado raiz como confiável.
>
> Em outros dispositivos que **não rodaram** o `mkcert -install`, o aviso aparece — basta clicar em "Avançado → Continuar mesmo assim".

---

## 8. Solução de problemas

| Problema | Causa provável | Solução |
|---|---|---|
| `FileNotFoundError: 192.168.31.156+2.pem` | Os `.pem` não foram gerados ou estão em outra pasta | Volte ao [passo 3.3](#passo-33--gerar-os-arquivos-pem) e gere na raiz do projeto |
| Navegador diz "conexão não é segura" | `mkcert -install` não foi executado | Rode `mkcert -install` no cmd como administrador |
| `ModuleNotFoundError: No module named 'flask'` | `venv` não está ativado ou Flask não foi instalado | `venv\Scripts\activate` e `pip install flask` |
| Outros dispositivos não conseguem acessar | Firewall do Windows bloqueando a porta `8850` | Liberar a porta no firewall ou rodar `netsh advfirewall firewall add rule name="Flask 8850" dir=in action=allow protocol=TCP localport=8850` |
| IP da máquina mudou | DHCP atribuiu novo IP | Gerar novos `.pem` com o IP atual e atualizar [app.py](app.py) |

---

## Limitação conhecida — `input()` não funciona

Comandos de entrada interativa (como `input()` em Python, `input()` em JavaScript, `Scanner` em Java, `scanf` em C, etc.) **não funcionam** nesta plataforma. O código que usa `input()` vai falhar com erro parecido com:

```
EOFError: EOF when reading a line
```

### Por que isso acontece

Em [app.py:14-17](app.py#L14-L17) a execução é feita assim:

```python
result = subprocess.run(
    [sys.executable, "-c", code],
    capture_output=True, text=True, timeout=10
)
```

Esse modelo é **one-shot** (uma única ida e volta):

1. O navegador envia o código por `POST /run`.
2. O servidor inicia o subprocesso Python, **sem `stdin` conectado a nada**.
3. O processo roda até terminar (ou até 10 s) e só então a saída é devolvida em uma única resposta JSON.

Quando o código chama `input()`, o Python tenta ler de um `stdin` vazio/fechado e dispara `EOFError` imediatamente. Não existe um canal aberto entre o navegador e o processo enquanto ele está rodando — então não há como o aluno "digitar" algo no meio da execução.

### Como contornar (sem alterar a plataforma)

Em vez de pedir entrada interativa, defina o valor diretamente no código:

```python
# Em vez disso:
nome = input("Seu nome: ")
print(f"Olá, {nome}")

# Faça assim:
nome = "Maria"
print(f"Olá, {nome}")
```

### O que seria preciso para `input()` funcionar

Trocar a arquitetura de request/response por **streaming bidirecional** (WebSocket ou Server-Sent Events) com um processo persistente, fazendo a ponte entre o terminal do navegador e o `stdin`/`stdout` do subprocesso. É uma reescrita significativa de [app.py](app.py) e do front-end, então fica como melhoria futura.

---

## Estrutura do projeto

```
id_alunos/
├── app.py                          # servidor Flask (HTTPS, porta 8850)
├── baixar_monaco.py                # baixa o editor Monaco para uso offline
├── 192.168.31.156+2.pem            # certificado SSL (gerado pelo mkcert)
├── 192.168.31.156+2-key.pem        # chave privada SSL (gerado pelo mkcert)
├── templates/
│   └── index.html                  # página do editor
├── static/
│   ├── editor.js                   # lógica do editor
│   ├── style.css
│   ├── cloudflare.js
│   └── vs/                         # Monaco Editor (gerado por baixar_monaco.py)
└── venv/                           # ambiente virtual Python
```
