/**
 * Dados fixos da Brigada Camarão que entram no orçamento e no contrato
 * — transcritos dos modelos em PDF que a própria Brigada usa hoje.
 * Tudo que muda com o tempo (conta bancária, representante, números
 * de apresentação, hora extra) está aqui, num lugar só: mudou, é só
 * editar este arquivo, sem mexer no layout dos documentos.
 */
export const EMPRESA = {
  razaoSocial: "BRIGADA CAMARÃO LTDA ME",
  // Cabeçalho do orçamento usa a grafia curta, como no modelo.
  nomeCabecalho: "Brigada Camarão – LTDA.",
  cnpj: "15.705.688/0001-82",
  inscricaoMunicipal: "0.827.857/003/3",
  endereco: "Rua Espinosa 602, Carlos Prates, Belo Horizonte/MG",
  cep: "30710-320",
  cidadeAssinatura: "Belo Horizonte",
  foro: "Belo Horizonte",
  representante: {
    nome: "Jonathan Cezar Gomes de Lima",
    rg: "MG 19056196",
    cpf: "136.602.796-50",
  },
  pagamento: {
    banco: "Banco do Brasil",
    agencia: "1228-9",
    conta: "77574-6",
    favorecido: "Brigada Camarão Ltda",
    pix: "CNPJ: 15.705.688/0001-82",
    prazo: "em até 10 dias pós-evento",
  },
  horaExtraPorBombeiro: "R$ 42,00",
  multaRescisaoPercentual: 10,
  apresentacao: {
    anosExperiencia: 13,
    eventosRealizados: "3.900",
    eventosInternacionais: 67,
  },
} as const;
