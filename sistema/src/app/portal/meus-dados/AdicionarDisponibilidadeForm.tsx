"use client";

import { DIAS_SEMANA, TURNOS } from "@/lib/constants";
import { adicionarDisponibilidade } from "./actions";

export function AdicionarDisponibilidadeForm() {
  return (
    <form action={adicionarDisponibilidade} className="flex flex-wrap items-end gap-2">
      <div className="field">
        <label htmlFor="dia_semana">Dia</label>
        <select id="dia_semana" name="dia_semana" defaultValue={DIAS_SEMANA[1]}>
          {DIAS_SEMANA.map((dia) => (
            <option key={dia} value={dia}>
              {dia}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="turno">Turno</label>
        <select id="turno" name="turno" defaultValue={Object.keys(TURNOS)[0]}>
          {Object.keys(TURNOS).map((turno) => (
            <option key={turno} value={turno}>
              {turno}
            </option>
          ))}
        </select>
      </div>
      <div className="field flex-1" style={{ minWidth: "140px" }}>
        <label htmlFor="regiao">Região (opcional)</label>
        <input type="text" id="regiao" name="regiao" placeholder="Ex.: Zona Sul" />
      </div>
      <button type="submit" className="btn btn--primary">
        Adicionar
      </button>
    </form>
  );
}
