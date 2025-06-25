# Release Process

Este documento descreve o processo automatizado de release e publicação da lib `star-node-stack-helper` no npm.

## Pipeline de CI/CD

O projeto utiliza GitHub Actions para automatizar o processo de build, teste e publicação. Existem quatro workflows principais:

### 1. Quality Check (`quality-check.yml`)

Executa em pushes para `main` e `develop`, e em pull requests:

- Auditoria de segurança das dependências
- Verificação de dependências desatualizadas
- Verificação de formatação de código
- Linting com ESLint
- Verificação de tipos TypeScript

### 2. Publish to NPM (`publish.yml`)

Executa em:

- Tags que começam com `v*` (ex: `v1.2.0`)
- Pushes para `main`
- Pull requests para `main`

**Jobs:**

- **Test**: Executa testes em múltiplas versões do Node.js (18, 20, 22)
- **Publish**: Publica no npm apenas quando uma tag é criada
- **GitHub Release**: Cria automaticamente um release no GitHub com informações detalhadas

### 3. Generate Changelog (`generate-changelog.yml`)

Executa após a criação de tags:

- Gera changelog baseado nos commits desde o último release
- Atualiza o GitHub Release com as mudanças recentes
- Filtra commits de desenvolvimento (chore, docs, etc.)

### 4. Release Notification (`release-notification.yml`)

Executa quando um release é publicado:

- Notifica sobre releases bem-sucedidos
- Cria comentários informativos no repositório
- Pode ser estendido para Slack, Discord, etc.

### 5. Dependabot Configuration (`.github/dependabot.yml`)

Configurado para atualizações automáticas de dependências:

- Verifica atualizações semanalmente (segunda-feira às 09:00)
- Atualiza apenas dependências diretas e indiretas
- Ignora atualizações major de pacotes críticos (@aws-sdk, typescript, etc.)
- Cria pull requests com labels apropriados
- Atribui reviewers automaticamente

### 6. Test Dependabot Configuration (`test-dependabot.yml`)

Workflow para testar a configuração do Dependabot:

- Verifica se os arquivos necessários existem
- Testa a instalação de dependências
- Verifica pacotes desatualizados
- Executa semanalmente e manualmente

### 7. Verify Cache Configuration (`verify-cache.yml`)

Workflow para verificar a configuração de cache:

- Testa se o pnpm-lock.yaml está sendo reconhecido
- Verifica se o cache do pnpm está funcionando
- Valida a instalação de dependências
- Executa em pushes para main e manualmente

### 8. Test PNPM Setup (`test-pnpm.yml`)

Workflow para testar a configuração do pnpm:

- Verifica se o pnpm está disponível no PATH
- Testa comandos básicos do pnpm
- Valida a instalação de dependências
- Executa em pushes para main e manualmente

## Como Fazer um Release

### 1. Preparação

```bash
# Certifique-se de estar na branch main
git checkout main
git pull origin main

# Execute os testes localmente
pnpm run test:ci
pnpm run lint
pnpm run build
```

### 2. Versionamento

Escolha o tipo de versão:

- **Patch** (1.1.0 → 1.1.1): Correções de bugs
- **Minor** (1.1.0 → 1.2.0): Novas funcionalidades (backward compatible)
- **Major** (1.1.0 → 2.0.0): Breaking changes

```bash
# Para patch
pnpm run version:patch

# Para minor
pnpm run version:minor

# Para major
pnpm run version:major
```

### 3. Criação da Tag

```bash
# O comando acima já cria uma tag local
# Agora faça push da tag para o GitHub
git push origin --tags
```

### 4. Publicação Automática

Após o push da tag, o GitHub Actions irá:

1. Executar todos os testes
2. Fazer o build do projeto
3. Publicar no npm automaticamente
4. Criar um GitHub Release com informações detalhadas
5. Gerar changelog baseado nos commits
6. Enviar notificações sobre o release

## GitHub Release Automático

O pipeline cria automaticamente um GitHub Release com:

### 📋 Informações Incluídas:

- **Versão e nome do release**
- **Link para o pacote no NPM**
- **Link para documentação**
- **Mensagem do commit principal**
- **Informações de build** (Node.js version, data, commit hash)
- **Instruções de instalação**
- **Changelog automático** com mudanças recentes

### 🎨 Formato do Release:

````markdown
## 🚀 New Release: v1.2.0

### 📦 Published to NPM

Package: `star-node-stack-helper@1.2.0`

### 🔗 Links

- [NPM Package](https://www.npmjs.com/package/star-node-stack-helper)
- [Documentation](https://github.com/starbem/star-node-stack-helper#readme)

### 📋 What's Changed

feat: add new AWS integration features

### 🏗️ Build Info

- Node.js Version: 20
- Build Date: 2024-01-15T10:30:00Z
- Commit: abc123def456

### 📥 Installation

```bash
npm install star-node-stack-helper@1.2.0
```
````

### 📝 Recent Changes

- feat: add new AWS integration features (abc123)
- fix: resolve SSL configuration issue (def456)
- docs: update README with examples (ghi789)

```

## Configuração Necessária

### Secrets do GitHub

Configure os seguintes secrets no repositório:

1. **NPM_TOKEN**: Token de acesso do npm
   - Gere em: https://www.npmjs.com/settings/tokens
   - Permissões: `Automation` com `Publish` habilitado

### Configuração do NPM

O arquivo `.npmrc` já está configurado para:

- Publicação pública (`access=public`)
- Registry oficial do npm
- Versões exatas das dependências

## Verificação do Release

Após a publicação, verifique:

1. [NPM Package](https://www.npmjs.com/package/star-node-stack-helper)
2. [GitHub Releases](https://github.com/starbem/star-node-stack-helper/releases)
3. [GitHub Actions](https://github.com/starbem/star-node-stack-helper/actions)
4. Notificações no repositório

## Troubleshooting

### Erro de Autenticação NPM

- Verifique se o `NPM_TOKEN` está configurado corretamente
- Certifique-se de que o token tem permissões de publicação

### Falha nos Testes

- Execute `pnpm run test:ci` localmente
- Verifique se todas as dependências estão atualizadas
- Corrija problemas de linting com `pnpm run lint:fix`

### Build Falhou

- Execute `pnpm run build` localmente
- Verifique se há erros de TypeScript
- Certifique-se de que o `tsconfig.json` está correto

### GitHub Release não foi criado

- Verifique se a tag foi criada corretamente
- Confirme se o workflow `publish.yml` foi executado
- Verifique os logs do GitHub Actions

### Erro de Cache de Dependências
- **Erro**: "Some specified paths were not resolved, unable to cache dependencies"
- **Causa**: Configuração incorreta do cache (usando package-lock.json em vez de pnpm-lock.yaml)
- **Solução**:
  - Verifique se todos os workflows usam `cache: 'pnpm'`
  - Confirme que `cache-dependency-path` aponta para `libs/star-node-stack-helper/pnpm-lock.yaml`
  - Execute o workflow "Verify Cache Configuration" para testar
- **Prevenção**: Sempre use `pnpm-lock.yaml` para projetos que usam pnpm

### Erro de PNPM não encontrado
- **Erro**: "Unable to locate executable file: pnpm"
- **Causa**: Ordem incorreta dos steps (Node.js setup antes do pnpm setup)
- **Solução**:
  - Configure pnpm ANTES do Node.js setup
  - Ordem correta: Checkout → Setup pnpm → Setup Node.js → Install dependencies
  - Execute o workflow "Test PNPM Setup" para verificar
- **Prevenção**: Sempre siga a ordem: pnpm setup → Node.js setup

## Rollback

Se necessário fazer rollback:

1. Despublique a versão no npm: `npm unpublish star-node-stack-helper@<version>`
2. Delete a tag: `git tag -d v<version> && git push origin :refs/tags/v<version>`
3. Delete o GitHub Release correspondente
4. Reverta o commit de versionamento se necessário
```
