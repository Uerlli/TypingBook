# Typingbook

Aplicativo pessoal de prática de digitação com livros. Os documentos e o progresso ficam no navegador, em IndexedDB e localStorage. A versão Sites usa uma origem diferente da versão Vercel: importe novamente seus livros nessa versão.

## Correções

- Alinhamento estritamente posicional, normalização NFC na extração, armazenamento e entrada, limite físico e lógico do texto, conclusão com ou sem erro final.
- Backspace limitado à palavra atual. Enter após Backspace finaliza essa palavra. Marcações discretas verdes para correções e âmbar para saltos; contagem por palavra nos resultados. Caracteres preenchidos automaticamente não aumentam os toques brutos nem os caracteres efetivamente digitados.
- Configuração por livro na importação e prática: 100/250/500 palavras, 1/2 frases, 1–5 minutos ou livre. Trocar modo preserva a posição atual. Sessões por frases respeitam abreviações comuns e preservam o texto e sua ordem.
- Modo de tempo usa janelas de até 6000 caracteres; o modo livre permite continuar até o fim do livro. O tempo começa no primeiro caractere. Progresso por tempo usa caracteres efetivamente digitados, excluindo preenchimento automático e caracteres apagados. Nos outros modos, progresso usa sessões concluídas.
- Ajustes adicionais: média da primeira tentativa, estatísticas iniciais dos exemplos, tratamento de falha ao salvar importação, compatibilidade com PDF.js e favicon.

## Verificação

`npm install`, `npm test`, `npm run type-check`, `npm run build`.

Os testes simulam a interface com React e JSDOM: acentos e NFC/NFD, conclusão, bloqueio de excesso, erro final, bloqueio de palavras anteriores, correção e salto por palavra, fim livre e pelo cronômetro, divisão em frases e palavras, persistência de configuração e progresso. Não substituem uma revisão visual ou uma avaliação completa de arquivos PDF/EPUB reais.
