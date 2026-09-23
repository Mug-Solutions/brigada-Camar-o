/* eslint-disable jsx-a11y/alt-text -- <Image> aqui é do react-pdf (desenha no PDF), não <img> de HTML: não existe prop alt. */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { fmtMoney } from "@/lib/domain";
import { fmtDataPorExtenso, montarLinhasTabela, type DadosDocumento } from "./dados";
import { EMPRESA } from "./empresa";
import type { ImagensDocumento } from "./imagens";
import { TabelaBrigadistas } from "./TabelaBrigadistas";

const BORDA = "0.75pt solid #000";

const s = StyleSheet.create({
  pagina: { paddingTop: 34, paddingBottom: 40, paddingHorizontal: 50, fontFamily: "Helvetica", fontSize: 10 },
  cabecalho: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  logo: { width: 50, height: 50, marginRight: 8 },
  cabecalhoTexto: { fontFamily: "Times-Roman", fontSize: 10, lineHeight: 1.25 },
  intro: { fontSize: 10, marginBottom: 8 },
  itens: { borderTop: BORDA, borderLeft: BORDA, marginBottom: 14 },
  item: { flexDirection: "row" },
  itemNumero: { width: 26, borderRight: BORDA, borderBottom: BORDA, padding: 2.5, fontSize: 9.5 },
  itemTexto: { flex: 1, borderRight: BORDA, borderBottom: BORDA, padding: 2.5, fontSize: 9.5 },
  negrito: { fontFamily: "Helvetica-Bold" },
  blocoEvento: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  camposEvento: { flex: 1, paddingRight: 12 },
  campo: { marginBottom: 2.5 },
  selo: { width: 72, height: 72 },
  apresentacao: { lineHeight: 1, marginBottom: 18 },
  valor: { marginTop: 18, marginBottom: 10 },
  local: { textAlign: "center", marginTop: 30 },
  assinaturaBloco: { alignItems: "center", marginTop: 4 },
  assinatura: { width: 105, height: 53, marginBottom: -30 },
  marcaDagua: { position: "absolute", right: 36, bottom: 70, width: 150, height: 150 },
});

/** Os 8 itens do modelo; trechos em negrito marcados como no original. */
const ITENS: { numero: string; partes: { texto: string; negrito?: boolean }[] }[] = [
  { numero: "I.", partes: [{ texto: "EMPRESA CREDENCIADA JUNTO AO " }, { texto: "CBMMG", negrito: true }, { texto: "." }] },
  { numero: "II.", partes: [{ texto: "Brigadista profissional credenciado junto ao " }, { texto: "CBMMG", negrito: true }, { texto: "." }] },
  { numero: "III.", partes: [{ texto: "Coordenador de equipe." }] },
  { numero: "IV.", partes: [{ texto: "Uniformizado com todo EPI individual." }] },
  { numero: "V.", partes: [{ texto: "Kit de primeiros socorros, prancha longa, rádio comunicadores." }] },
  {
    numero: "VI.",
    partes: [
      { texto: "Atendendo as exigências da " },
      { texto: "IT 12 do CBMMG", negrito: true },
      { texto: " visando uma ótima prestação de serviço." },
    ],
  },
  { numero: "VII.", partes: [{ texto: "Alimentação, transporte." }] },
  {
    numero: "VIII.",
    partes: [
      { texto: "Brigadistas devidamente registrados via contrato de trabalho intermitente " },
      { texto: "conforme determinação do Ministério do Trabalho", negrito: true },
    ],
  },
];

interface OrcamentoPdfProps {
  dados: DadosDocumento;
  imagens: ImagensDocumento;
  emitidoEm: Date;
}

export function OrcamentoPdf({ dados, imagens, emitidoEm }: OrcamentoPdfProps) {
  const { evento, cliente } = dados;
  const { apresentacao } = EMPRESA;

  return (
    <Document title={`Orçamento — ${evento.nome}`} author={EMPRESA.nomeCabecalho} language="pt-BR">
      <Page size="A4" style={s.pagina}>
        {/* Marca d'água primeiro: fica por baixo do conteúdo. */}
        <Image src={imagens.marcaDagua} style={s.marcaDagua} fixed />

        <View style={s.cabecalho}>
          <Image src={imagens.logo} style={s.logo} />
          <View>
            <Text style={s.cabecalhoTexto}>{EMPRESA.nomeCabecalho}</Text>
            <Text style={s.cabecalhoTexto}>CNPJ: {EMPRESA.cnpj}</Text>
            <Text style={s.cabecalhoTexto}>
              Endereço: {EMPRESA.endereco} – CEP: {EMPRESA.cep}
            </Text>
          </View>
        </View>

        <Text style={s.intro}>
          Segue orçamento com detalhes da prestação de serviço, seguindo as normas exigidas para realização do evento:
        </Text>

        <View style={s.itens}>
          {ITENS.map((item) => (
            <View key={item.numero} style={s.item} wrap={false}>
              <Text style={s.itemNumero}>{item.numero}</Text>
              <Text style={s.itemTexto}>
                {item.partes.map((p, i) => (
                  <Text key={i} style={p.negrito ? s.negrito : undefined}>
                    {p.texto}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.blocoEvento}>
          <View style={s.camposEvento}>
            <Text style={s.campo}>
              <Text style={s.negrito}>- Evento: </Text>
              {evento.nome}
            </Text>
            <Text style={s.campo}>
              <Text style={s.negrito}>- Contratante: </Text>
              {cliente?.nome}
            </Text>
            <Text style={s.campo}>
              <Text style={s.negrito}>- Local: </Text>
              {evento.local}
            </Text>
            <Text style={s.campo}>
              <Text style={s.negrito}>- Serviço: </Text>
              Brigadistas
            </Text>
          </View>
          <Image src={imagens.seloIso} style={s.selo} />
        </View>

        <Text style={s.apresentacao}>
          - A Brigada Camarão conta {apresentacao.anosExperiencia} anos de experiência em eventos, estádio de futebol e
          feiras, sendo a <Text style={s.negrito}>ÚNICA BRIGADA CERTIFICADA PELA ISO9001</Text>, a fazer, com
          exclusividade, eventos internacionais. Leve qualidade e credibilidade para seu evento. Conte com a{" "}
          <Text style={s.negrito}>BRIGADA CAMARÃO</Text>. Com mais de {apresentacao.eventosRealizados} eventos
          realizados, sendo {apresentacao.eventosInternacionais} eventos internacionais.
        </Text>

        <TabelaBrigadistas linhas={montarLinhasTabela(dados.programacao)} />

        <Text style={s.valor}>
          - Valor final da prestação de serviço é:{" "}
          <Text style={s.negrito}>{fmtMoney(Number(evento.valor_fechamento))}</Text>
        </Text>
        <Text>
          - Forma de pagamento: {EMPRESA.pagamento.prazo} via transferência bancária ou pix.
        </Text>

        <View wrap={false}>
          <Text style={s.local}>
            {EMPRESA.cidadeAssinatura}, {fmtDataPorExtenso(emitidoEm)}
          </Text>
          <View style={s.assinaturaBloco}>
            <Image src={imagens.assinatura} style={s.assinatura} />
            <Text>{EMPRESA.representante.nome}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
