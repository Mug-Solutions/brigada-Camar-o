/* eslint-disable jsx-a11y/alt-text -- <Image> aqui é do react-pdf (desenha no PDF), não <img> de HTML: não existe prop alt. */
import type { ReactNode } from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { fmtMoney } from "@/lib/domain";
import { fmtDataPorExtenso, fmtQuantidadeBrigadistas, montarLinhasTabela, type DadosDocumento } from "./dados";
import { EMPRESA } from "./empresa";
import type { ImagensDocumento } from "./imagens";
import { TabelaBrigadistas } from "./TabelaBrigadistas";

const CINZA = "#d9d9d9";

const s = StyleSheet.create({
  pagina: { paddingTop: 36, paddingBottom: 34, paddingHorizontal: 60, fontFamily: "Helvetica", fontSize: 9.5 },
  cabecalho: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  logo: { width: 110, height: 104 },
  cabecalhoTitulos: { flex: 1, alignItems: "center", paddingLeft: 12 },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 2 },
  contratanteTopo: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginTop: 14 },
  rotuloContratante: { fontFamily: "Helvetica-BoldOblique", textDecoration: "underline", backgroundColor: CINZA },
  paragrafo: { textAlign: "justify", lineHeight: 1.3, marginBottom: 4 },
  negrito: { fontFamily: "Helvetica-Bold" },
  faixaContratada: { backgroundColor: CINZA, paddingVertical: 3, paddingHorizontal: 4, marginTop: 10, marginBottom: 4 },
  clausula: { marginTop: 11, marginBottom: 5 },
  clausulaTitulo: {
    alignSelf: "flex-start",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    backgroundColor: CINZA,
    paddingHorizontal: 2,
  },
  item: { textAlign: "justify", lineHeight: 1.3, paddingLeft: 10 },
  alinea: { textAlign: "justify", lineHeight: 1.3, paddingLeft: 10 },
  tabela: { marginTop: 12, marginBottom: 4 },
  data: { textAlign: "right", marginTop: 12, marginBottom: 22 },
  assinaturas: { paddingLeft: 10 },
  linhaAssinatura: { width: 330, borderTop: "0.75pt solid #000", paddingTop: 3 },
  blocoContratada: { marginTop: 8 },
  imagemAssinatura: { width: 100, height: 50, marginLeft: 105, marginBottom: -16 },
  rotulo: { fontFamily: "Helvetica-Bold", marginTop: 4 },
});

function TituloClausula({ children }: { children: ReactNode }) {
  return (
    <View style={s.clausula} minPresenceAhead={60}>
      <Text style={s.clausulaTitulo}>{children}</Text>
    </View>
  );
}

interface ContratoPdfProps {
  dados: DadosDocumento;
  imagens: ImagensDocumento;
  emitidoEm: Date;
}

export function ContratoPdf({ dados, imagens, emitidoEm }: ContratoPdfProps) {
  const { evento } = dados;
  // pendenciasDocumento("contrato") já garantiu cliente, CNPJ e endereço
  // antes de chegar aqui — a rota não monta o PDF sem isso.
  const cliente = dados.cliente!;
  const razaoSocial = cliente.nome.toUpperCase();
  const quantidade = fmtQuantidadeBrigadistas(evento.quantitativo_bombeiros);
  const { pagamento, representante } = EMPRESA;

  return (
    <Document title={`Contrato — ${evento.nome}`} author={EMPRESA.razaoSocial} language="pt-BR">
      <Page size="A4" style={s.pagina}>
        <View style={s.cabecalho}>
          <Image src={imagens.logo} style={s.logo} />
          <View style={s.cabecalhoTitulos}>
            <Text style={s.titulo}>CONTRATO FIRMADO ENTRE {EMPRESA.razaoSocial}</Text>
            <Text style={s.titulo}>e {razaoSocial}</Text>
            <Text style={s.contratanteTopo}>
              <Text style={s.rotuloContratante}>CONTRATANTE:</Text> {razaoSocial}
            </Text>
          </View>
        </View>

        <Text style={s.paragrafo}>
          <Text style={s.negrito}>{razaoSocial}</Text>, pessoa jurídica, inscrita no CNPJ: {cliente.cnpj} com sede à{" "}
          {cliente.endereco} denominado <Text style={s.negrito}>Contratante.</Text>
        </Text>

        <View style={s.faixaContratada}>
          <Text style={s.negrito}>CONTRATADA: {EMPRESA.razaoSocial}.</Text>
        </View>
        <Text style={s.paragrafo}>
          {EMPRESA.razaoSocial}, pessoa jurídica de direito privado, inscrita regularmente no CNPJ sob o n°{" "}
          {EMPRESA.cnpj}, Insc. Municipal: {EMPRESA.inscricaoMunicipal}, com sede na {EMPRESA.endereco}, CEP:{" "}
          {EMPRESA.cep}, neste ato representado por <Text style={s.negrito}>{representante.nome}</Text>, portador da
          cédula de identidade RG nº {representante.rg}, inscrito no CPF sob o nº {representante.cpf}, doravante
          denominada <Text style={s.negrito}>Contratada</Text>.
        </Text>
        <Text style={s.paragrafo}>
          As partes acima qualificadas ajustam entre si, na melhor forma de direito o presente instrumento contratual de
          acordo com as cláusulas seguintes;
        </Text>

        <TituloClausula>CLÁUSULA PRIMEIRA - DO OBJETO</TituloClausula>
        <Text style={s.item}>
          <Text style={s.negrito}>1.1. </Text>Constitui objeto do presente contrato a prestação de serviço de{" "}
          <Text style={s.negrito}>{quantidade}</Text> para o evento <Text style={s.negrito}>{evento.nome}</Text> a ser
          realizado na <Text style={s.negrito}>{evento.local}</Text> – compreendendo os dias e horários abaixo
          indicados:
        </Text>
        <View style={s.tabela}>
          <TabelaBrigadistas linhas={montarLinhasTabela(dados.programacao)} />
        </View>

        <TituloClausula>CLÁUSULA SEGUNDA - DO PRAZO</TituloClausula>
        <Text style={s.item}>
          <Text style={s.negrito}>2.1. </Text>O presente contrato terá vigência a partir da data da sua assinatura até o
          final da prestação de serviços, nas datas previstas na cláusula 1.1, que ocorrerá conforme planilha acima - ou
          até que se cumpram todas as obrigações propostas neste contrato.
        </Text>

        <TituloClausula>CLÁUSULA TERCEIRA - DO VALOR E FORMA DE PAGAMENTO</TituloClausula>
        <Text style={s.item}>
          <Text style={s.negrito}>3.1. </Text>O valor total a ser pago pela contratante a contratada para prestação dos
          serviços descritos no presente instrumento é de{" "}
          <Text style={s.negrito}>{fmtMoney(Number(evento.valor_fechamento))}</Text>, considerando o fornecimento da
          mão-de-obra de <Text style={s.negrito}>{quantidade}</Text> que será pago da seguinte forma: 100% do valor{" "}
          {pagamento.prazo} por meio de depósito bancário na conta: {pagamento.banco}, Agência {pagamento.agencia},
          Conta: {pagamento.conta} Favorecido: {pagamento.favorecido} (PIX: {pagamento.pix}) mediante emissão e envio
          da Nota Fiscal.
        </Text>
        <Text style={[s.item, s.negrito]}>O valor da hora extra é de {EMPRESA.horaExtraPorBombeiro} por bombeiro.</Text>

        <TituloClausula>CLÁUSULA QUARTA – CONDIÇÕES GERAIS</TituloClausula>
        <Text style={s.item}>
          <Text style={s.negrito}>4.1. </Text>O presente contrato não importa em vínculo trabalhista entre a{" "}
          <Text style={s.negrito}>contratante</Text> e os sócios, empregados e prepostos da{" "}
          <Text style={s.negrito}>contratada,</Text> sendo a <Text style={s.negrito}>contratada</Text> somente
          prestadora de serviços a <Text style={s.negrito}>contratante</Text>, sem qualquer subordinação hierárquica.
        </Text>
        <Text style={s.item}>
          <Text style={s.negrito}>4.2. </Text>Em situações não previstas no presente instrumento será aplicada a
          legislação brasileira e inexistindo esta, caberá as partes de mútuo acordo a soluções de eventuais
          controvérsias sempre pautando-se pelos princípios de probidade boa-fé conforme estipula o Art.422 do Código
          Civil Brasileiro.
        </Text>

        <TituloClausula>CLÁUSULA QUINTA – DA RESCISÃO E PENALIDADES</TituloClausula>
        <Text style={s.item}>
          <Text style={s.negrito}>5.1. </Text>O descumprimento de cláusula ou condição estipulada no presente
          caracterizará a inadimplência da parte infratora sujeitando-se esta ao pagamento de multa sem caráter
          compensatório, no percentual de {EMPRESA.multaRescisaoPercentual}%, sobre o valor total deste contrato.
        </Text>
        <Text style={s.item}>
          <Text style={s.negrito}>5.2. </Text>O presente contrato poderá ser rescindido de pleno direito independente de
          quaisquer formalidades nas seguintes hipóteses:
        </Text>
        <Text style={s.alinea}>
          <Text style={s.negrito}>a) </Text>Declaração de falência de qualquer das partes.
        </Text>
        <Text style={s.alinea}>
          <Text style={s.negrito}>b) </Text>Inobservância pela <Text style={s.negrito}>contratada/contratante</Text> dos
          prazos, cláusulas e condições estabelecidas no contrato.
        </Text>
        <Text style={s.alinea}>
          <Text style={s.negrito}>c) </Text>Inobservância do nível de qualidade proposto.
        </Text>
        <Text style={s.alinea}>
          <Text style={s.negrito}>d) </Text>Descumprimento de quaisquer outras obrigações estabelecidas neste contrato.
        </Text>

        <TituloClausula>CLÁUSULA SEXTA – DO FORO</TituloClausula>
        <Text style={s.item}>
          <Text style={s.negrito}>6.1. </Text>As partes elegem o foro da comarca de {EMPRESA.foro} como competente para
          dirimir quaisquer dúvidas ou controvérsias oriundas deste instrumento, ou sua execução, renunciando a qualquer
          outro, por mais privilegiado que seja.
        </Text>
        <Text style={s.item}>
          E, por estarem justas e contratadas, assinam as partes o presente instrumento em duas vias de igual teor de
          forma digital.
        </Text>

        {/* Data + as duas assinaturas nunca se separam entre páginas. */}
        <View wrap={false}>
          <Text style={s.data}>
            {EMPRESA.cidadeAssinatura}, {fmtDataPorExtenso(emitidoEm)}
          </Text>
          <View style={s.assinaturas}>
            <View style={s.linhaAssinatura}>
              <Text style={s.negrito}>
                {razaoSocial}, CNPJ: {cliente.cnpj}
              </Text>
              <Text style={s.rotulo}>CONTRATANTE</Text>
            </View>
            <View style={s.blocoContratada}>
              <Image src={imagens.assinatura} style={s.imagemAssinatura} />
              <View style={s.linhaAssinatura}>
                <Text style={s.negrito}>
                  {EMPRESA.razaoSocial}, CNPJ: {EMPRESA.cnpj}
                </Text>
                <Text style={s.rotulo}>CONTRATADA</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
