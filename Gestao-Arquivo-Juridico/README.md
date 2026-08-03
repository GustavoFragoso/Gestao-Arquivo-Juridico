# ⚖️ Sistema de Gestão de Arquivo Jurídico & Digitalização Contínua

> **Aplicação Web/Desktop corporativa desenvolvida para gestão documental, organização automatizada de acervos jurídicos por cliente e integração direta com scanners via automação PowerShell WIA.**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![PowerShell](https://img.shields.io/badge/PowerShell-5391FE?style=for-the-badge&logo=powershell&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

---

## 📌 Visão Geral do Projeto

Este sistema foi projetado para resolver um problema real em ambientes jurídicos e corporativos: a **digitalização massiva, classificação e armazenamento organizado de documentos físicos de clientes**.

A solução elimina a necessidade de softwares proprietários de scanner pagos, permitindo que a aplicação web se comunique diretamente com scanners físicos conectados ao Windows (300 DPI), compilando múltiplas páginas em arquivos PDF únicos categorizados por tipo de documento.

---

## 🔥 Principais Funcionalidades

- 📁 **Organização Automatizada de Pastas por Cliente:** Criação e manutenção de estruturas de diretórios padronizadas (Documentos Pessoais, Médicos, Rurais, Contratos, etc.).
- 🖨️ **Digitalização Direta via Hardware (300 DPI):** Integração assíncrona entre o Node.js e a API WIA (Windows Image Acquisition) através de scripts PowerShell.
- 📄 **Compilação e Divisão de PDFs (jsPDF):** Suporte a digitalização contínua multi-folhas compiladas em um único PDF, com controle automatizado de tamanho máximo por arquivo (split inteligente).
- 📥 **Importação Massiva via CSV:** Cadastro em lote de clientes a partir de planilhas.
- 💾 **Persistência Híbrida & Privacidade:** Armazenamento seguro de dados locais utilizando `IndexedDB` no navegador e sistema de arquivos nativo do sistema operacional (offline-first).

---

## 🏗️ Arquitetura do Sistema

```mermaid
graph TD
    User[Interface Web HTML5/CSS/JS] -->|Ações do Usuário| FrontApp[app.js - Lógica Frontend / IndexedDB]
    FrontApp -->|POST /api/digitalizar| ServerNode[server.js - Servidor Node.js HTTP]
    ServerNode -->|execFile assíncrono| PS[digitalizar-scanner.ps1 - PowerShell + WIA COM API]
    PS -->|Comando 300 DPI| HardwareScanner[Scanner Físico / WIA Device Manager]
    HardwareScanner -->|Imagem JPEG| PS
    PS -->|Salva imagem temporária| TempStorage[.digitalizacoes-temporarias]
    ServerNode -->|Stream & Autocleanup| FrontApp
    FrontApp -->|Compilação em PDF| StorageFolder[Banco de Documentos dos Clientes]
```

---

## 🎯 Destaques Técnicos para Entrevistas de Emprego / Trainee

Quando for apresentar este projeto em seleções técnicas ou entrevistas de programa Trainee, você pode destacar:

1. **Integração Backend-Hardware (Node.js + PowerShell):** Explique como utilizou o módulo `child_process.execFile` para integrar uma aplicação Node.js leve com objetos COM de baixo nível do Windows (WIA DeviceManager).
2. **Arquitetura Offline-First & Privacidade:** O projeto mantém os dados 100% locais no computador do cliente, eliminando riscos de vazamento de dados sensíveis na nuvem (aderência à LGPD).
3. **Gestão de Recursos e Limpeza Automática:** Demonstre como o servidor Node.js cria streams de leitura (`fs.createReadStream`) e remove os arquivos temporários imediatamente após a transferência (`stream.on('close')`), evitando acúmulo de lixo em disco.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- **Sistema Operacional:** Windows 10 ou 11 (para integração com WIA Scanner).
- **Node.js:** Versão 14 ou superior instalada.

### Passo a Passo

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/GustavoFragoso/Gestao-Arquivo-Juridico.git
   cd Gestao-Arquivo-Juridico
   ```

2. **Iniciar o Servidor:**
   Dê dois cliques no arquivo `INICIAR ARQUIVO JURIDICO.bat` ou execute no terminal:
   ```bash
   node server.js
   ```

3. **Acessar a Aplicação:**
   Abra seu navegador em: `http://localhost:3000`
