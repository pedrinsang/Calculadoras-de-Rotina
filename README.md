# 🧮 Calculadoras de Rotina em Virologia

**Ferramentas práticas e essenciais para cálculos frequentes em virologia e laboratórios clínicos, desenvolvidas para otimizar o dia a dia de profissionais de saúde e pesquisadores.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Beta](https://img.shields.io/badge/status-beta-orange.svg)](#)
---

## 📖 Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [✨ Funcionalidades Principais](#-funcionalidades-principais)
- [🛠️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [🚀 Começando](#-começando)
  - [Pré-requisitos](#pré-requisitos)
  - [Instalação e Configuração](#instalação-e-configuração)
- [🔧 Como Usar](#-como-usar)
- [📂 Estrutura do Projeto Detalhada](#-estrutura-do-projeto-detalhada)
- [🤝 Contribuindo](#-contribuindo)
- [📄 Licença](#-licença)
- [📞 Contato](#-contato)
- [🙏 Agradecimentos](#-agradecimentos)

---

## 🎯 Sobre o Projeto

O "Calculadoras de Rotina em Virologia" é uma aplicação web progressiva (PWA) projetada para simplificar e agilizar os cálculos comuns realizados em laboratórios de virologia. Com uma interface amigável e foco na praticidade, a ferramenta visa auxiliar estudantes, técnicos, pesquisadores e profissionais da área, fornecendo acesso rápido a calculadoras específicas, um vasto hub de protocolos e funcionalidades de gerenciamento de tarefas.

A aplicação utiliza Firebase para autenticação de usuários e armazenamento de dados (Firestore), garantindo uma experiência personalizada e segura.

*(Sugestão: Adicione um screenshot da tela principal ou do hub aqui!)*
---

## ✨ Funcionalidades Principais

-   **Calculadoras Específicas:**
    -   **Soroneutralização:** Cálculos detalhados para ensaios de soroneutralização.
    -   **Vacinas:** Cálculos para preparo de vacinas bovinas, caninas e cálculo de formol.
    -   **ELISA:** Ferramentas para auxiliar nos cálculos de reagentes para ensaios de ELISA (Leucose e BVDV) com checklists de protocolo.
-   **Hub de Protocolos:** Acesso facilitado a uma extensa coleção de protocolos laboratoriais em formato PDF, cobrindo diversas áreas da virologia e técnicas moleculares.
-   **Mural de Tarefas (Kanban):** Sistema para gerenciamento de tarefas e amostras laboratoriais, permitindo o acompanhamento do status (pendente, em progresso, concluído) e registro de resultados.
-   **Histórico de Tarefas Concluídas:** Armazenamento e consulta de tarefas finalizadas, com opção de visualização de detalhes e **exportação de laudos em formato .docx**.
-   **Autenticação de Usuário:** Sistema de login e cadastro seguro utilizando Firebase Authentication.
-   **Gerenciamento de Conta:** Os usuários podem visualizar e editar suas informações de perfil (nome, sigla) e gerenciar a segurança da conta (alteração de senha, exclusão de conta).
-   **Progressive Web App (PWA):** Permite a instalação da aplicação em dispositivos móveis e desktops para acesso rápido e funcionalidades offline (para assets cacheados).
-   **Interface Responsiva e Intuitiva:** Design limpo e fácil de usar, adaptado para diferentes tamanhos de tela.

---

## 🛠️ Tecnologias Utilizadas

-   **Frontend:**
    -   HTML5
    -   CSS3 (com variáveis, Flexbox, Grid)
    -   JavaScript (ES6+ Modules)
    -   Bootstrap 5
-   **Backend & Infraestrutura:**
    -   Firebase Authentication (para login/cadastro)
    -   Firebase Firestore (para armazenamento de dados do mural, histórico e usuários)
-   **Bibliotecas Externas (Client-Side):**
    -   `docx` (para geração de documentos .docx)
    -   `pako` (inferido pela presença de `flate.js` em `jszip` dentro de `docx.js`, para compressão/descompressão)
-   **PWA:**
    -   Manifest.json
    -   Service Worker (`sw.js`)

---

## 🚀 Começando

Para obter uma cópia local funcionando, siga estas etapas.

### Pré-requisitos

-   Um navegador web moderno (Chrome, Firefox, Edge, Safari).
-   Git (para clonar o repositório).
-   (Opcional, para desenvolvimento) Um servidor web local simples (como Live Server para VSCode) para evitar problemas com CORS ao carregar módulos JS ou acessar arquivos locais.

### Instalação e Configuração

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/pedrinsang/Calculadoras-de-Rotina.git](https://github.com/pedrinsang/Calculadoras-de-Rotina.git)
    cd Calculadoras-de-Rotina
    ```

2.  **Configuração do Firebase:**
    Este projeto utiliza Firebase para autenticação e banco de dados. A inicialização do Firebase foi centralizada em `assets/js/firebase.js` (SDK v11), e os módulos de página importam `app`, `auth` e/ou `db` a partir desse arquivo:
    -   `assets/js/firebase.js` (ponto único de inicialização)
    -   `assets/js/pages/index.js`
    -   `assets/js/pages/conta.js`
    -   `assets/js/pages/hub.js`
    -   `assets/js/pages/mural/mural.js`
    -   `assets/js/pages/mural/regresultado.js`
    -   `assets/js/pages/historico/historico.js`
    -   `assets/js/pages/historico/resultado.js`

   
    **Nota:** Para um ambiente de produção ou se você for fazer seu próprio deploy, é altamente recomendável que você crie seu próprio projeto Firebase e substitua essas credenciais pelas suas. Armazenar chaves de API diretamente no código-fonte do cliente é aceitável para chaves públicas do Firebase, mas para qualquer chave sensível (que não parece ser o caso aqui para a configuração básica do Firebase SDK), utilize variáveis de ambiente ou um sistema de configuração seguro.

3.  **Acesse a Aplicação:**
    Abra o arquivo `index.html` no seu navegador.

---

## 🔧 Como Usar

1.  **Login/Cadastro:**
    -   Acesse a página `index.html`.
    -   Se você é um novo usuário, clique em "Cadastre-se", preencha seus dados e o código secreto fornecido pelo administrador.
    -   Se já possui uma conta, insira seu email e senha para fazer login.
    -   A opção "Permanecer conectado" salva sua sessão localmente.
2.  **Hub Principal (`pages/hub.html`):**
    -   Após o login, você será direcionado ao Hub.
    -   Navegue para as calculadoras desejadas (Soroneutralização, Vacinas, ELISA).
    -   Acesse o "Mural de Tarefas" para gerenciar amostras e análises.
    -   Consulte os "Protocolos" disponíveis.
    -   Clique no ícone de engrenagem (⚙️) para acessar as "Configurações da Conta".
3.  **Calculadoras (`pages/elisa.html`, `pages/soroneutralizacao.html`, `pages/vacinas.html`):**
    -   Selecione o tipo de cálculo desejado.
    -   Insira os dados nos campos apropriados.
    -   Clique em "Calcular".
    -   Os resultados serão exibidos e poderão ser copiados.
    -   Algumas calculadoras (como ELISA) possuem checklists de protocolo integrados.
4.  **Mural de Tarefas (`pages/mural.html`):**
    -   Adicione novas tarefas (amostras) com detalhes como ID, tipo, quantidade, proprietário, veterinário, etc.
    -   Acompanhe o status: "Pendente", "Em Progresso", "Concluído".
    -   Registre os resultados diretamente do mural para os tipos de teste aplicáveis (SN, ELISA, PCR, Raiva, ICC).
    -   Edite ou exclua tarefas.
5.  **Protocolos (`pages/protocolos.html`):**
    -   Navegue e filtre a lista de protocolos.
    -   Clique em "Visualizar" para abrir o PDF do protocolo desejado em uma nova aba.
6.  **Histórico (`pages/historico.html`):**
    -   Visualize tarefas que foram marcadas como "Concluídas" no mural.
    -   Busque por tarefas antigas.
    -   Veja detalhes das tarefas e seus resultados.
    -   Restaure tarefas para o mural, se necessário.
    -   **Baixe laudos em formato .docx**.
7.  **Conta (`pages/conta.html`):**
    -   Visualize suas informações (Nome, Sigla, Email, Data de Cadastro).
    -   Edite seu Nome e Sigla.
    -   Solicite a redefinição de senha (um email será enviado).
    -   Exclua sua conta permanentemente (requer confirmação e senha).

---

## 📂 Estrutura do Projeto Detalhada

```plaintext
Calculadoras-de-Rotina/
├── index.html                # Página de Login/Cadastro (Ponto de entrada)
├── manifest.json             # Configurações do PWA (Progressive Web App)
├── sw.js                     # Service Worker para PWA (cache e offline)
├── README.md                 # Este arquivo
├── icons/                    # Ícones para PWA e favicon
│   ├── icon-72x72.png
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── pages/                    # Páginas HTML secundárias da aplicação
│   ├── conta.html            # Página de gerenciamento de conta do usuário
│   ├── elisa.html            # Calculadora e protocolos para ELISA
│   ├── historico.html        # Página para visualização do histórico de tarefas
│   ├── hub.html              # Página central de navegação após login
│   ├── mural.html            # Mural de tarefas/amostras
│   ├── protocolos.html       # Hub de visualização de protocolos PDF
│   ├── soroneutralizacao.html # Calculadora para Soroneutralização
│   └── vacinas.html          # Calculadora para Vacinas
├── assets/                   # Arquivos estáticos (CSS, JS, Imagens, Protocolos)
│   ├── css/                  # Folhas de estilo
│   │   ├── styles.css        # Estilos globais
│   │   └── pages/            # Estilos específicos para cada página
│   │       ├── calculadoras.css
│   │       ├── conta.css
│   │       ├── elisa.css
│   │       ├── historico.css
│   │       ├── hub.css
│   │       ├── index.css
│   │       ├── mural.css
│   │       ├── protocolos.css
│   │       ├── soroneutralizacao.css
│   │       └── vacinas.css
│   ├── js/                   # Arquivos JavaScript
│   │   └── pages/            # Scripts específicos para cada página e funcionalidade
│   │       ├── conta.js
│   │       ├── hub.js
│   │       ├── index.js
│   │       ├── protocolos.js
│   │       ├── calculadoras/
│   │       │   ├── elisa.js
│   │       │   ├── soroneutralizacao.js
│   │       │   └── vacinas.js
│   │       ├── historico/
│   │       │   ├── baixarDoc.js   # Lógica para download de documentos
│   │       │   ├── historico.js   # Lógica principal da página de histórico
│   │       │   └── resultado.js   # Lógica para exibir resultados no histórico
│   │       └── mural/
│   │           ├── mural.js       # Lógica principal do mural
│   │           └── regresultado.js # Lógica para registrar resultados no mural
│   ├── images/               # Imagens utilizadas no site (ex: logo-sv.png)
│   ├── lib/                  # Bibliotecas de terceiros
│   │   └── docx.js           # Biblioteca para geração de DOCX
│   └── protocolos/           # PDFs dos protocolos laboratoriais
│       ├── Clonagem de vírus por ensaio de placa.pdf
│       ├── Coagulação por glutaraldeído.pdf
│       └── ... (muitos outros arquivos PDF)
