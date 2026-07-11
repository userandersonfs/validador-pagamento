// Testa a extracao de NOME em cenarios reais (sem OCR, texto direto).
import { parseReceipt } from '../src/parser.js';

let falhas = 0;
function checa(nome, texto, esperado) {
  const r = parseReceipt(texto);
  const ok = r.nome === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK ' : 'ERRO'}  ${nome}  ->  nome="${r.nome}"  (esperado "${esperado}")`);
}

// A) Comprovante real (Mercado Pago): tem "Quem recebeu" E "Quem pagou".
// Deve pegar o PAGADOR (Silmara), nunca o recebedor (Marlon).
checa('duas secoes', `Você
Pix enviado
R$ 31,00
Sobre a transação
Data do pagamento Sábado, 11/07/2026
Horário 17h55
Identificador is4b4372956dfc48c68b8bb399d20a7d43
ID da transação E00416968202607112055S8u7WOkPtKG
Quem recebeu
Nome Marlon Douglas Castro Costa
CPF/CNPJ ***.976.063-**
Instituição Mercado Pago Ip LTDA.
Quem pagou
Nome Silmara de Freitas
CPF/CNPJ ***.228.336-**
Instituição Nubank`, 'Silmara de Freitas');

// B) Foto cortou o nome do pagador: melhor VAZIO que o recebedor errado.
checa('pagador cortado', `Quem recebeu
Nome Marlon Douglas Castro Costa
Instituição Mercado Pago
Quem pagou
Nome`, '');

// C) So tem o recebedor: nao chutar o nome dele como pagador.
checa('so recebedor', `Comprovante Pix
R$ 50,00
11/07/2026
Quem recebeu
Nome Marlon Douglas Castro Costa
Instituição Mercado Pago`, '');

// D) Comprovante simples: nome logo abaixo de "Pagador" (sem rotulo "Nome").
checa('pagador sem rotulo', `Comprovante de Pix
R$ 150,00
11/07/2026 as 14:32
Pagador
Anderson Farias Souza
Nubank`, 'Anderson Farias Souza');

// E) Comprovante de um nome so, sem secoes.
checa('nome unico', `Comprovante
Nome João da Silva Santos
Valor R$ 20,00
11/07/2026`, 'João da Silva Santos');

// F) Pagador MEI: razao social comeca com o numero do CNPJ.
// Deve limpar os numeros e pegar o nome.
checa('pagador MEI (Inter)', `Quem recebeu
Nome Marlon Douglas Castro Costa
Instituição Mercado Pago lp LTDA.
Quem pagou
Nome 43 229 226 SILMARA DE FREITAS
CPF/CNPJ 43.229.226/0001-71
Instituição Banco Inter S.A.`, 'SILMARA DE FREITAS');

// G) Fotos cortaram os cabecalhos: sobrou so "Nome ...". Recebedor mascarado,
// pagador com CNPJ completo -> deve pegar o pagador (Silmara), nao Marlon.
checa('sem cabecalho, doc completo', `Nome Marlon Douglas Castro Costa
CPF/CNPJ ***.976.063-**
Instituição Mercado Pago
Nome 43 229 226 SILMARA DE FREITAS
CPF/CNPJ 43.229.226/0001-71
Instituição Banco Inter S.A.`, 'SILMARA DE FREITAS');

console.log('\n' + (falhas === 0 ? 'TODOS OK ✓' : `${falhas} FALHA(S)`));
process.exit(falhas === 0 ? 0 : 1);
