import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { LinhaTabela } from "./dados";

const BORDA = "0.75pt solid #000";

const s = StyleSheet.create({
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 6 },
  tabela: { alignSelf: "center", width: 400, borderTop: BORDA, borderLeft: BORDA },
  linha: { flexDirection: "row" },
  celula: {
    flex: 1,
    borderRight: BORDA,
    borderBottom: BORDA,
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    fontSize: 9.5,
    textAlign: "center",
  },
  cabecalho: { fontFamily: "Helvetica-Bold" },
});

const COLUNAS = ["DATA", "HORÁRIO", "CARGA HORÁRIA", "QUANTIDADE"] as const;

/**
 * Tabela DATA / HORÁRIO / CARGA HORÁRIA / QUANTIDADE — idêntica no
 * orçamento e no contrato. A tabela pode quebrar de página (evento de
 * muitos dias), mas nenhuma linha se parte ao meio, e o título não
 * fica sozinho no pé da página.
 */
export function TabelaBrigadistas({ linhas }: { linhas: LinhaTabela[] }) {
  return (
    <View>
      <Text style={s.titulo} minPresenceAhead={40}>
        BRIGADISTAS
      </Text>
      <View style={s.tabela}>
        <View style={s.linha} wrap={false}>
          {COLUNAS.map((c) => (
            <Text key={c} style={[s.celula, s.cabecalho]}>
              {c}
            </Text>
          ))}
        </View>
        {linhas.map((l, i) => (
          <View key={i} style={s.linha} wrap={false}>
            <Text style={s.celula}>{l.data}</Text>
            <Text style={s.celula}>{l.horario}</Text>
            <Text style={s.celula}>{l.cargaHoraria}</Text>
            <Text style={s.celula}>{l.quantidade}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
