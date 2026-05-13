"""
Baixa o Monaco Editor (versão minificada) do npm registry
e extrai para static/vs — pronto para uso offline.
"""
import urllib.request
import tarfile
import shutil
import os

VERSION = "0.41.0"
URL = f"https://registry.npmjs.org/monaco-editor/-/monaco-editor-{VERSION}.tgz"
DESTINO = os.path.join("static", "vs")
TEMP = "monaco_tmp.tgz"

print(f"Baixando Monaco Editor {VERSION}...")
urllib.request.urlretrieve(URL, TEMP)
print("Download concluído. Extraindo...")

if os.path.exists(DESTINO):
    shutil.rmtree(DESTINO)
os.makedirs(DESTINO)

with tarfile.open(TEMP, "r:gz") as tar:
    for member in tar.getmembers():
        # O tgz tem tudo dentro de "package/min/vs/..."
        if member.name.startswith("package/min/vs/"):
            member.name = member.name[len("package/min/vs/"):]
            if member.name:  # ignora o diretório raiz vazio
                tar.extract(member, DESTINO)

os.remove(TEMP)
print(f"Monaco Editor extraído para '{DESTINO}' com sucesso!")
print("Agora rode o app normalmente — sem necessidade de internet.")
