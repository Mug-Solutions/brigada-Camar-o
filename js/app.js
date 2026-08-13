(function(){
  "use strict";

  /* ===================== DATA (fictícios — nenhum dado real do cliente) ===================== */
  var TODAY = new Date(2026,7,6); // 06/08/2026

  var FUNCOES = ["Bombeiro Civil","Bombeiro Civil Líder","Supervisora de Brigada"];
  var TURNOS = {
    "Diurno":   {ini:"08:00", fim:"18:00", valor:150},
    "Noturno":  {ini:"18:00", fim:"00:00", valor:135},
    "Especial": {ini:"08:00", fim:"20:00", valor:280}
  };
  var ALIMENTACAO_DIA = 20;

  var seq = {b:11, e:6, s:100};

  var bombeiros = [
    {id:"b1",  nome:"Marina Costa Andrade",     cpf:"305.918.472-60", tel:"(31) 98123-4455", funcao:"Bombeiro Civil",         aso:"2026-09-15", esocial:"812", esocialStatus:"Ativo",  cred:"2026-12-10"},
    {id:"b2",  nome:"Eduardo Lima Souza",       cpf:"274.836.109-92", tel:"(31) 99234-5566", funcao:"Bombeiro Civil",         aso:"2026-08-20", esocial:"813", esocialStatus:"Ativo",  cred:"2027-01-02"},
    {id:"b3",  nome:"Vinícius Almeida Rocha",   cpf:"618.204.957-31", tel:"(31) 98345-6677", funcao:"Bombeiro Civil Líder",   aso:"2026-06-30", esocial:"814", esocialStatus:"Ativo",  cred:"2025-11-15"},
    {id:"b4",  nome:"Beatriz Fernandes Melo",   cpf:"452.170.836-08", tel:"(31) 99456-7788", funcao:"Bombeiro Civil",         aso:"2026-10-10", esocial:"815", esocialStatus:"Ativo",  cred:"2026-08-18"},
    {id:"b5",  nome:"Rodrigo Santos Pereira",   cpf:"793.615.240-77", tel:"(31) 98567-8899", funcao:"Bombeiro Civil",         aso:"2026-08-09", esocial:"816", esocialStatus:"Ativo",  cred:"2026-10-01"},
    {id:"b6",  nome:"Isabela Martins Duarte",   cpf:"936.482.017-53", tel:"(31) 99678-9900", funcao:"Supervisora de Brigada", aso:"2027-01-20", esocial:"817", esocialStatus:"Ativo",  cred:"2026-09-05"},
    {id:"b7",  nome:"Gustavo Ribeiro Nunes",    cpf:"205.749.638-14", tel:"(31) 98789-0011", funcao:"Bombeiro Civil",         aso:"2026-07-28", esocial:"818", esocialStatus:"Inativo",cred:"2026-12-01"},
    {id:"b8",  nome:"Carolina Vieira Barros",   cpf:"861.023.594-29", tel:"(31) 99890-1122", funcao:"Bombeiro Civil",         aso:"2026-11-11", esocial:"819", esocialStatus:"Ativo",  cred:"2027-02-14"},
    {id:"b9",  nome:"Felipe Moraes Cardozo",    cpf:"347.596.281-65", tel:"(31) 98901-2233", funcao:"Bombeiro Civil",         aso:"2026-08-25", esocial:"820", esocialStatus:"Ativo",  cred:"2026-08-15"},
    {id:"b10", nome:"Renata Oliveira Castro",   cpf:"570.842.163-90", tel:"(31) 99012-3344", funcao:"Bombeiro Civil",         aso:"2026-09-30", esocial:"821", esocialStatus:"Ativo",  cred:"2026-06-20"}
  ];

  var eventos = [
    {id:"ev1", nome:"Feira de Negócios Vale do Aço", cliente:"Prisma Eventos & Produções", local:"Centro de Convenções — Belo Horizonte", inicio:"2026-08-01", fim:"2026-08-03", qtd:8,  materiais:"10 extintores de incêndio, 1 DEA, kit de primeiros socorros", valorFechamento:8200,  status:"Concluído"},
    {id:"ev2", nome:"Festival Horizonte Sonoro", cliente:"Onda Cultural Produções", local:"Parque Municipal — Contagem", inicio:"2026-08-15", fim:"2026-08-15", qtd:14, materiais:"18 extintores, 2 cadeiras de rodas, sinalização de rota de fuga", valorFechamento:12600, status:"Confirmado"},
    {id:"ev3", nome:"Copa Regional de Futebol — Final", cliente:"Liga Esportiva Mineira", local:"Estádio Municipal — Betim", inicio:"2026-08-22", fim:"2026-08-22", qtd:30, materiais:"30 extintores, 2 DEA, brigada volante", valorFechamento:27800, status:"Confirmado"},
    {id:"ev4", nome:"Feira de Saúde e Bem-Estar", cliente:"Grupo Vitalis Saúde", local:"Shopping — Nova Lima", inicio:"2026-08-29", fim:"2026-08-29", qtd:6, materiais:"8 extintores, kit de primeiros socorros", valorFechamento:4300, status:"Confirmado"},
    {id:"ev5", nome:"Corrida Solidária de Verão", cliente:"Ativa Assessoria Esportiva", local:"Praça da Liberdade — Belo Horizonte", inicio:"2026-09-05", fim:"2026-09-05", qtd:10, materiais:"10 extintores, ambulância de apoio (terceirizada)", valorFechamento:6900, status:"Planejamento"}
  ];

  var escalas = [
    {id:"s1",eventoId:"ev1",data:"2026-08-01",turno:"Diurno",bombeiroId:"b1",cumprido:"08:02–18:00",valor:150},
    {id:"s2",eventoId:"ev1",data:"2026-08-01",turno:"Diurno",bombeiroId:"b4",cumprido:"07:57–18:05",valor:150},
    {id:"s3",eventoId:"ev1",data:"2026-08-01",turno:"Noturno",bombeiroId:"b2",cumprido:"18:00–23:50",valor:135},
    {id:"s4",eventoId:"ev1",data:"2026-08-02",turno:"Diurno",bombeiroId:"b1",cumprido:"08:00–18:00",valor:150},
    {id:"s5",eventoId:"ev1",data:"2026-08-02",turno:"Noturno",bombeiroId:"b5",cumprido:"18:10–00:00",valor:135},
    {id:"s6",eventoId:"ev1",data:"2026-08-02",turno:"Noturno",bombeiroId:"b9",cumprido:"18:00–00:03",valor:135},
    {id:"s7",eventoId:"ev1",data:"2026-08-03",turno:"Diurno",bombeiroId:"b4",cumprido:"08:00–17:55",valor:150},
    {id:"s8",eventoId:"ev1",data:"2026-08-03",turno:"Diurno",bombeiroId:"b8",cumprido:"08:05–18:00",valor:150},
    {id:"s9",eventoId:"ev1",data:"2026-08-03",turno:"Especial",bombeiroId:"b6",cumprido:"08:00–20:10",valor:280},

    {id:"s10",eventoId:"ev2",data:"2026-08-15",turno:"Noturno",bombeiroId:"b2",cumprido:"—",valor:135},
    {id:"s11",eventoId:"ev2",data:"2026-08-15",turno:"Noturno",bombeiroId:"b5",cumprido:"—",valor:135},
    {id:"s12",eventoId:"ev2",data:"2026-08-15",turno:"Especial",bombeiroId:"b6",cumprido:"—",valor:280},
    {id:"s13",eventoId:"ev2",data:"2026-08-15",turno:"Noturno",bombeiroId:"b9",cumprido:"—",valor:135},
    {id:"s14",eventoId:"ev2",data:"2026-08-15",turno:"Noturno",bombeiroId:"b10",cumprido:"—",valor:135},

    {id:"s15",eventoId:"ev3",data:"2026-08-22",turno:"Diurno",bombeiroId:"b1",cumprido:"—",valor:150},
    {id:"s16",eventoId:"ev3",data:"2026-08-22",turno:"Diurno",bombeiroId:"b2",cumprido:"—",valor:150},
    {id:"s17",eventoId:"ev3",data:"2026-08-22",turno:"Diurno",bombeiroId:"b4",cumprido:"—",valor:150},
    {id:"s18",eventoId:"ev3",data:"2026-08-22",turno:"Diurno",bombeiroId:"b5",cumprido:"—",valor:150},
    {id:"s19",eventoId:"ev3",data:"2026-08-22",turno:"Diurno",bombeiroId:"b6",cumprido:"—",valor:150},
    {id:"s20",eventoId:"ev3",data:"2026-08-22",turno:"Diurno",bombeiroId:"b8",cumprido:"—",valor:150},
    {id:"s21",eventoId:"ev3",data:"2026-08-22",turno:"Diurno",bombeiroId:"b9",cumprido:"—",valor:150},
    {id:"s22",eventoId:"ev3",data:"2026-08-22",turno:"Diurno",bombeiroId:"b10",cumprido:"—",valor:150},

    {id:"s23",eventoId:"ev4",data:"2026-08-29",turno:"Diurno",bombeiroId:"b1",cumprido:"—",valor:150},
    {id:"s24",eventoId:"ev4",data:"2026-08-29",turno:"Diurno",bombeiroId:"b2",cumprido:"—",valor:150},
    {id:"s25",eventoId:"ev4",data:"2026-08-29",turno:"Diurno",bombeiroId:"b4",cumprido:"—",valor:150},
    {id:"s26",eventoId:"ev4",data:"2026-08-29",turno:"Diurno",bombeiroId:"b5",cumprido:"—",valor:150},
    {id:"s27",eventoId:"ev4",data:"2026-08-29",turno:"Diurno",bombeiroId:"b6",cumprido:"—",valor:150},
    {id:"s28",eventoId:"ev4",data:"2026-08-29",turno:"Diurno",bombeiroId:"b8",cumprido:"—",valor:150}
  ];

  var financeiroExtra = {
    ev1:{pagoBombeirosData:"2026-08-05", pagoBombeirosStatus:"Pago", recebidoClienteData:"2026-08-10", recebidoClienteStatus:"Recebido"},
    ev2:{pagoBombeirosData:"2026-08-16", pagoBombeirosStatus:"Pendente", recebidoClienteData:"2026-08-20", recebidoClienteStatus:"Pendente"},
    ev3:{pagoBombeirosData:"2026-08-23", pagoBombeirosStatus:"Pendente", recebidoClienteData:"2026-08-27", recebidoClienteStatus:"Pendente"},
    ev4:{pagoBombeirosData:"2026-07-30", pagoBombeirosStatus:"Atrasado", recebidoClienteData:"2026-08-02", recebidoClienteStatus:"Atrasado"},
    ev5:{pagoBombeirosData:"2026-09-06", pagoBombeirosStatus:"Pendente", recebidoClienteData:"2026-09-10", recebidoClienteStatus:"Pendente"}
  };

  var clientesConhecidos = uniq(eventos.map(function(e){return e.cliente;}));

  /* ===================== HELPERS ===================== */
  function uniq(arr){ return arr.filter(function(v,i){return arr.indexOf(v)===i;}); }

  function parseISO(s){
    var p = s.split("-"); return new Date(+p[0], +p[1]-1, +p[2]);
  }
  function fmtBR(s){
    if(!s) return "—";
    var p = s.split("-"); return p[2]+"/"+p[1]+"/"+p[0];
  }
  function fmtMoney(n){
    return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  }
  function diffDays(iso){
    return Math.round((parseISO(iso) - TODAY)/86400000);
  }
  function docStatus(iso){
    var d = diffDays(iso);
    if(d < 0) return {level:"crit", label:"Vencido"};
    if(d <= 30) return {level:"warn", label:"Vence em "+d+"d"};
    return {level:"ok", label:"Válido"};
  }
  function chip(level, label){
    return '<span class="chip chip--'+level+'">'+label+'</span>';
  }
  function bombeiroAptidao(b){
    var aso = docStatus(b.aso), cred = docStatus(b.cred);
    if(b.esocialStatus === "Inativo") return {level:"crit", label:"Inativo"};
    if(aso.level === "crit" || cred.level === "crit") return {level:"crit", label:"Impedido"};
    if(aso.level === "warn" || cred.level === "warn") return {level:"warn", label:"Atenção"};
    return {level:"ok", label:"Apto"};
  }
  function byId(arr,id){ for(var i=0;i<arr.length;i++){ if(arr[i].id===id) return arr[i]; } return null; }
  function bombeiroNome(id){ var b = byId(bombeiros,id); return b ? b.nome : "—"; }

  function escalasDoEvento(eventoId){
    return escalas.filter(function(s){ return s.eventoId === eventoId; });
  }
  function financeiroEvento(ev){
    var lista = escalasDoEvento(ev.id);
    var pagoBombeiros = lista.reduce(function(sum,s){ return sum+s.valor; },0);
    var diarias = lista.length;
    var alimentacao = diarias * ALIMENTACAO_DIA;
    var custoTotal = pagoBombeiros + alimentacao;
    var lucro = ev.valorFechamento - custoTotal;
    var margem = ev.valorFechamento > 0 ? (lucro/ev.valorFechamento*100) : 0;
    return {pagoBombeiros:pagoBombeiros, diarias:diarias, alimentacao:alimentacao, custoTotal:custoTotal, lucro:lucro, margem:margem};
  }

  function statusPillClass(s){
    if(s==="Concluído") return "neutral";
    if(s==="Confirmado") return "ok";
    if(s==="Planejamento") return "warn";
    return "neutral";
  }
  function pagStatusLevel(s){
    if(s==="Pago" || s==="Recebido") return "ok";
    if(s==="Atrasado") return "crit";
    return "warn";
  }

  /* ===================== APP STATE ===================== */
  var state = { view:"painel", eventoDetalheId:null, bomFiltro:"todos", bomBusca:"", evFiltro:"todos" };

  var main = document.getElementById("main");
  var navEl = document.getElementById("nav");

  navEl.addEventListener("click", function(e){
    var btn = e.target.closest(".nav-item");
    if(!btn) return;
    state.view = btn.getAttribute("data-view");
    state.eventoDetalheId = null;
    render();
  });

  function setActiveNav(){
    Array.prototype.forEach.call(navEl.querySelectorAll(".nav-item"), function(b){
      b.classList.toggle("active", b.getAttribute("data-view") === state.view);
    });
  }

  /* ===================== RENDER ROUTER ===================== */
  function render(){
    setActiveNav();
    if(state.view === "painel") return renderPainel();
    if(state.view === "bombeiros") return renderBombeiros();
    if(state.view === "eventos"){
      return state.eventoDetalheId ? renderEventoDetalhe(state.eventoDetalheId) : renderEventos();
    }
    if(state.view === "financeiro") return renderFinanceiro();
  }

  /* ===================== PAINEL ===================== */
  function renderPainel(){
    var ativos = bombeiros.filter(function(b){return b.esocialStatus==="Ativo";}).length;
    var pendencias = bombeiros.filter(function(b){var a=bombeiroAptidao(b); return a.level!=="ok";});
    var doMes = eventos.filter(function(e){ var d=parseISO(e.inicio); return d.getMonth()===7 && d.getFullYear()===2026; });
    var faturamentoMes = doMes.reduce(function(s,e){return s+e.valorFechamento;},0);
    var lucroMes = doMes.reduce(function(s,e){return s+financeiroEvento(e).lucro;},0);
    var emPlanejamento = eventos.filter(function(e){return e.status==="Planejamento";}).length;

    var proximos = eventos.slice().filter(function(e){return parseISO(e.inicio) >= TODAY;})
      .sort(function(a,b){return parseISO(a.inicio)-parseISO(b.inicio);}).slice(0,4);

    var maiorLucro = Math.max.apply(null, eventos.map(function(e){return financeiroEvento(e).lucro;}).concat([1]));

    main.innerHTML =
      topbarHTML("Painel", "Visão geral da operação — bombeiros, escalas e resultado financeiro em um só lugar.", "") +
      '<div class="kpi-grid">' +
        kpiTile("Bombeiros Ativos", ativos+" / "+bombeiros.length, "cadastrados no quadro") +
        kpiTile("Pendências de Documento", pendencias.length, pendencias.length ? "requer atenção" : "tudo em dia", pendencias.length ? "warn" : "ok") +
        kpiTile("Eventos em Agosto", doMes.length, "no período") +
        kpiTile("Faturamento do Mês", fmtMoney(faturamentoMes), "valor de fechamento") +
        kpiTile("Lucro Bruto do Mês", fmtMoney(lucroMes), "estimado") +
        kpiTile("Em Planejamento", emPlanejamento, "aguardando confirmação") +
      '</div>' +
      '<div class="two-col">' +
        '<div>' +
          '<div class="panel-block">' +
            '<div class="panel-block-head"><h2>Próximos Eventos</h2><span class="hint">ordenado por data</span></div>' +
            (proximos.length ? proximos.map(function(e){
              var d = parseISO(e.inicio); var meses=["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
              var f = financeiroEvento(e);
              var cobertura = Math.min(100, Math.round(f.diarias / (e.qtd||1) * 100));
              return '<div class="agenda-item">' +
                '<div class="agenda-date"><div class="d num">'+d.getDate()+'</div><div class="m">'+meses[d.getMonth()]+'</div></div>' +
                '<div class="agenda-info"><div class="t">'+e.nome+'</div><div class="s">'+e.cliente+' · '+e.local+'</div></div>' +
                '<span class="pill pill--'+statusPillClass(e.status)+'">'+e.status+'</span>' +
              '</div>';
            }).join("") : '<div class="empty"><div class="glyph">◇</div><p>Nenhum evento futuro cadastrado.</p></div>') +
          '</div>' +
          '<div class="panel-block">' +
            '<div class="panel-block-head"><h2>Lucro Bruto por Evento</h2><span class="hint">mês de agosto</span></div>' +
            doMes.map(function(e){
              var f = financeiroEvento(e);
              var pct = Math.max(4, Math.round(f.lucro/maiorLucro*100));
              return '<div class="bar-row">' +
                '<div class="lbl">'+e.nome+'</div>' +
                '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div>' +
                '<div class="bar-val num">'+fmtMoney(f.lucro)+'</div>' +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>' +
        '<div class="panel-block">' +
          '<div class="panel-block-head"><h2>Pendências de Documentação</h2><span class="hint">'+pendencias.length+' bombeiro(s)</span></div>' +
          (pendencias.length ? pendencias.map(function(b){
            var aso=docStatus(b.aso), cred=docStatus(b.cred);
            var motivo = b.esocialStatus==="Inativo" ? "Cadastro inativo no E-Social" :
              (aso.level!=="ok" ? "ASO — "+aso.label : "Credenciamento — "+cred.label);
            var ap = bombeiroAptidao(b);
            return '<div class="alert-row">' +
              '<div class="name">'+b.nome+'<div class="reason">'+motivo+'</div></div>' +
              chip(ap.level, ap.label) +
            '</div>';
          }).join("") : '<div class="empty"><div class="glyph">✓</div><p>Nenhuma pendência no momento.</p></div>') +
        '</div>' +
      '</div>';
  }

  function kpiTile(label, value, delta, deltaClass){
    return '<div class="kpi"><div class="eyebrow">'+label+'</div><div class="value num">'+value+'</div><div class="delta '+(deltaClass||"")+'">'+delta+'</div></div>';
  }

  function topbarHTML(title, lede, actionsHTML){
    return '<div class="topbar"><div><h1>'+title+'</h1><p class="lede">'+lede+'</p></div><div class="topbar-actions">'+actionsHTML+'</div></div>';
  }

  /* ===================== BOMBEIROS ===================== */
  function renderBombeiros(){
    main.innerHTML =
      topbarHTML("Bombeiros", "Cadastro do quadro de bombeiros civis e status de documentação obrigatória.",
        '<button class="btn btn--primary" id="btnNovoBombeiro">+ Novo Bombeiro</button>') +
      '<div class="panel-block">' +
        '<div class="filter-bar">' +
          '<div class="search">🔎<input type="text" id="bomBusca" placeholder="Buscar por nome…" value="'+state.bomBusca+'"></div>' +
          '<div class="seg" id="bomSeg">' +
            segBtn("todos","Todos") + segBtn("apto","Aptos") + segBtn("atencao","Atenção") + segBtn("impedido","Impedidos") +
          '</div>' +
        '</div>' +
        '<div class="table-wrap">' +
          '<table><thead><tr><th>Nome</th><th>Função</th><th>ASO</th><th>E-Social</th><th>Credenciamento</th><th>Situação</th></tr></thead>' +
          '<tbody id="bomTbody"></tbody></table>' +
        '</div>' +
      '</div>';

    document.getElementById("btnNovoBombeiro").addEventListener("click", openFormNovoBombeiro);
    document.getElementById("bomBusca").addEventListener("input", function(e){ state.bomBusca = e.target.value; renderBomTbody(); });
    document.getElementById("bomSeg").addEventListener("click", function(e){
      var b = e.target.closest("button"); if(!b) return;
      state.bomFiltro = b.getAttribute("data-k"); renderBomTbody();
    });
    renderBomTbody();
  }

  function segBtn(key,label){
    return '<button data-k="'+key+'" class="'+(state.bomFiltro===key?"active":"")+'">'+label+'</button>';
  }

  function renderBomTbody(flashId){
    var seg = document.getElementById("bomSeg");
    if(seg) Array.prototype.forEach.call(seg.querySelectorAll("button"), function(b){
      b.classList.toggle("active", b.getAttribute("data-k")===state.bomFiltro);
    });
    var q = state.bomBusca.toLowerCase();
    var list = bombeiros.filter(function(b){
      if(q && b.nome.toLowerCase().indexOf(q)===-1) return false;
      var ap = bombeiroAptidao(b);
      if(state.bomFiltro==="apto") return ap.level==="ok";
      if(state.bomFiltro==="atencao") return ap.level==="warn";
      if(state.bomFiltro==="impedido") return ap.level==="crit";
      return true;
    });
    var tbody = document.getElementById("bomTbody");
    if(!list.length){
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="glyph">◇</div><p>Nenhum bombeiro encontrado com esse filtro.</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(b){
      var aso=docStatus(b.aso), cred=docStatus(b.cred), ap=bombeiroAptidao(b);
      return '<tr class="'+(b.id===flashId?"row-flash":"")+'" data-id="'+b.id+'">' +
        '<td class="name-cell">'+b.nome+'<span class="sub mono">'+b.cpf+'</span></td>' +
        '<td>'+b.funcao+'</td>' +
        '<td>'+chip(aso.level, fmtBR(b.aso)+" · "+aso.label)+'</td>' +
        '<td>'+chip(b.esocialStatus==="Ativo"?"ok":"crit", "Mat. "+b.esocial+" · "+b.esocialStatus)+'</td>' +
        '<td>'+chip(cred.level, fmtBR(b.cred)+" · "+cred.label)+'</td>' +
        '<td>'+chip(ap.level, ap.label)+'</td>' +
      '</tr>';
    }).join("");
  }

  function openFormNovoBombeiro(){
    openDrawer({
      title:"Novo Bombeiro", sub:"Cadastro e documentação obrigatória", wide:false,
      body:
        '<fieldset><legend>Dados Pessoais</legend>' +
          field("nb_nome","Nome completo","text","",true) +
          '<div class="field-row">' + field("nb_cpf","CPF","text","000.000.000-00") + field("nb_tel","Telefone","text","(31) 90000-0000") + '</div>' +
          fieldSelect("nb_funcao","Função",FUNCOES) +
        '</fieldset>' +
        '<fieldset><legend>Documentação</legend>' +
          field("nb_aso","Data do ASO","date","",true) +
          '<div class="live-chip-row"><span class="field-hint">Status calculado:</span><span id="nb_aso_chip">—</span></div>' +
          field("nb_esocial","Matrícula E-Social","text","Ex.: 822",true) +
          field("nb_cred","Validade do Credenciamento","date","",true) +
          '<div class="live-chip-row"><span class="field-hint">Status calculado:</span><span id="nb_cred_chip">—</span></div>' +
        '</fieldset>',
      footHTML: '<button class="btn btn--ghost" id="fCancel">Cancelar</button><button class="btn btn--primary" id="fSave">Salvar Bombeiro</button>'
    });

    var asoInput = document.getElementById("nb_aso");
    var credInput = document.getElementById("nb_cred");
    asoInput.addEventListener("change", function(){
      var s = docStatus(asoInput.value); document.getElementById("nb_aso_chip").innerHTML = asoInput.value ? chip(s.level,s.label) : "—";
    });
    credInput.addEventListener("change", function(){
      var s = docStatus(credInput.value); document.getElementById("nb_cred_chip").innerHTML = credInput.value ? chip(s.level,s.label) : "—";
    });
    document.getElementById("fCancel").addEventListener("click", closeDrawer);
    document.getElementById("fSave").addEventListener("click", function(){
      var nome = document.getElementById("nb_nome").value.trim();
      var aso = asoInput.value, cred = credInput.value, esoc = document.getElementById("nb_esocial").value.trim();
      if(!nome || !aso || !cred || !esoc){ toast("Preencha nome, ASO, credenciamento e matrícula."); return; }
      var id = "b"+(seq.b++);
      bombeiros.push({
        id:id, nome:nome, cpf:document.getElementById("nb_cpf").value || "—",
        tel:document.getElementById("nb_tel").value || "—",
        funcao:document.getElementById("nb_funcao").value, aso:aso, esocial:esoc, esocialStatus:"Ativo", cred:cred
      });
      closeDrawer();
      renderBombeiros();
      renderBomTbody(id);
      toast("Bombeiro cadastrado com sucesso.");
    });
  }

  /* ===================== EVENTOS ===================== */
  function renderEventos(){
    main.innerHTML =
      topbarHTML("Eventos & Escalas", "Contratos recebidos de empresas organizadoras e a escala de bombeiros alocada em cada um.",
        '<button class="btn btn--primary" id="btnNovoEvento">+ Novo Evento</button>') +
      '<div class="panel-block">' +
        '<div class="filter-bar">' +
          '<div class="seg" id="evSeg">' +
            evSegBtn("todos","Todos") + evSegBtn("Planejamento","Planejamento") + evSegBtn("Confirmado","Confirmado") + evSegBtn("Concluído","Concluído") +
          '</div>' +
        '</div>' +
        '<div class="table-wrap">' +
          '<table><thead><tr><th>Evento</th><th>Cliente</th><th>Data</th><th>Cobertura da Escala</th><th>Valor Fechamento</th><th>Status</th></tr></thead>' +
          '<tbody id="evTbody"></tbody></table>' +
        '</div>' +
      '</div>';

    document.getElementById("btnNovoEvento").addEventListener("click", openFormNovoEvento);
    document.getElementById("evSeg").addEventListener("click", function(e){
      var b = e.target.closest("button"); if(!b) return;
      state.evFiltro = b.getAttribute("data-k"); renderEvTbody();
    });
    renderEvTbody();
  }

  function evSegBtn(key,label){
    return '<button data-k="'+key+'" class="'+(state.evFiltro===key?"active":"")+'">'+label+'</button>';
  }

  function renderEvTbody(flashId){
    var list = eventos.filter(function(e){ return state.evFiltro==="todos" || e.status===state.evFiltro; })
      .sort(function(a,b){return parseISO(a.inicio)-parseISO(b.inicio);});
    var tbody = document.getElementById("evTbody");
    if(!list.length){
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="glyph">◇</div><p>Nenhum evento nesse filtro.</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(e){
      var f = financeiroEvento(e);
      var pct = Math.min(100, Math.round(f.diarias/(e.qtd||1)*100));
      return '<tr class="clickable '+(e.id===flashId?"row-flash":"")+'" data-id="'+e.id+'">' +
        '<td class="name-cell">'+e.nome+'<span class="sub">'+e.local+'</span></td>' +
        '<td>'+e.cliente+'</td>' +
        '<td class="num">'+fmtBR(e.inicio)+(e.fim!==e.inicio ? " – "+fmtBR(e.fim):"")+'</td>' +
        '<td><div class="progress-line"><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div><span class="progress-label num">'+f.diarias+'/'+e.qtd+'</span></div></td>' +
        '<td class="num">'+fmtMoney(e.valorFechamento)+'</td>' +
        '<td><span class="pill pill--'+statusPillClass(e.status)+'">'+e.status+'</span></td>' +
      '</tr>';
    }).join("");
    Array.prototype.forEach.call(tbody.querySelectorAll("tr.clickable"), function(tr){
      tr.addEventListener("click", function(){ state.eventoDetalheId = tr.getAttribute("data-id"); render(); });
    });
  }

  function openFormNovoEvento(){
    openDrawer({
      title:"Novo Evento", sub:"Registrar contrato recebido do cliente", wide:false,
      body:
        '<fieldset><legend>Dados do Contrato</legend>' +
          fieldWithList("ne_cliente","Cliente","clienteList",clientesConhecidos,true) +
          field("ne_nome","Nome do Evento","text","",true) +
          field("ne_local","Local","text","",true) +
          '<div class="field-row">' + field("ne_inicio","Data de Início","date","",true) + field("ne_fim","Data de Término","date","",true) + '</div>' +
          field("ne_qtd","Quantitativo de Brigadistas","number","Ex.: 10",true) +
        '</fieldset>' +
        '<fieldset><legend>Materiais &amp; Equipamentos</legend>' +
          '<div class="field"><textarea id="ne_materiais" placeholder="Ex.: 10 extintores, 1 DEA, kit de primeiros socorros"></textarea></div>' +
        '</fieldset>' +
        '<fieldset><legend>Financeiro</legend>' +
          field("ne_valor","Valor de Fechamento (R$)","number","Ex.: 9600",true) +
        '</fieldset>',
      footHTML: '<button class="btn btn--ghost" id="fCancel">Cancelar</button><button class="btn btn--primary" id="fSave">Criar Evento</button>'
    });
    document.getElementById("fCancel").addEventListener("click", closeDrawer);
    document.getElementById("fSave").addEventListener("click", function(){
      var nome = document.getElementById("ne_nome").value.trim();
      var cliente = document.getElementById("ne_cliente").value.trim();
      var inicio = document.getElementById("ne_inicio").value;
      var qtd = +document.getElementById("ne_qtd").value || 0;
      var valor = +document.getElementById("ne_valor").value || 0;
      if(!nome || !cliente || !inicio || !qtd || !valor){ toast("Preencha cliente, evento, data, quantitativo e valor."); return; }
      var fim = document.getElementById("ne_fim").value || inicio;
      var id = "ev"+(seq.e++);
      eventos.push({
        id:id, nome:nome, cliente:cliente, local:document.getElementById("ne_local").value || "—",
        inicio:inicio, fim:fim, qtd:qtd, materiais:document.getElementById("ne_materiais").value || "—",
        valorFechamento:valor, status:"Planejamento"
      });
      financeiroExtra[id] = {pagoBombeirosData:"", pagoBombeirosStatus:"Pendente", recebidoClienteData:"", recebidoClienteStatus:"Pendente"};
      clientesConhecidos = uniq(clientesConhecidos.concat([cliente]));
      closeDrawer();
      renderEventos();
      renderEvTbody(id);
      toast("Evento criado. Escala pronta para ser montada.");
    });
  }

  function fieldWithList(id,label,listId,options,required){
    return '<div class="field"><label for="'+id+'">'+label+'</label>' +
      '<input list="'+listId+'" id="'+id+'" '+(required?"required":"")+'>' +
      '<datalist id="'+listId+'">'+options.map(function(o){return '<option value="'+o+'">';}).join("")+'</datalist></div>';
  }

  /* ===================== EVENTO DETALHE / ESCALA ===================== */
  function renderEventoDetalhe(id){
    var ev = byId(eventos, id);
    if(!ev){ state.eventoDetalheId = null; return renderEventos(); }
    var lista = escalasDoEvento(id).slice().sort(function(a,b){ return a.data.localeCompare(b.data); });
    var f = financeiroEvento(ev);
    var pct = Math.min(100, Math.round(f.diarias/(ev.qtd||1)*100));
    var aptos = bombeiros.filter(function(b){ return bombeiroAptidao(b).level !== "crit"; });

    main.innerHTML =
      '<div class="topbar"><div>' +
        '<button class="btn btn--ghost btn--sm" id="btnVoltar" style="margin-bottom:10px;">← Voltar para Eventos</button>' +
        '<h1>'+ev.nome+'</h1>' +
        '<p class="lede">'+ev.cliente+' · '+ev.local+' · '+fmtBR(ev.inicio)+(ev.fim!==ev.inicio?" a "+fmtBR(ev.fim):"")+'</p>' +
      '</div><div class="topbar-actions"><span class="pill pill--'+statusPillClass(ev.status)+'">'+ev.status+'</span></div></div>' +

      '<div class="kpi-grid">' +
        kpiTile("Valor de Fechamento", fmtMoney(ev.valorFechamento), "cobrado do cliente") +
        kpiTile("Cobertura da Escala", f.diarias+" / "+ev.qtd, pct+"% preenchido", pct<100?"warn":"ok") +
        kpiTile("Pago aos Bombeiros", fmtMoney(f.pagoBombeiros), f.diarias+" diária(s) lançada(s)") +
        kpiTile("Lucro Bruto Estimado", fmtMoney(f.lucro), f.margem.toFixed(0)+"% de margem") +
      '</div>' +

      '<div class="panel-block">' +
        '<div class="panel-block-head"><h2>Materiais &amp; Equipamentos</h2></div>' +
        '<div style="padding:15px 18px; font-size:13.5px; color:var(--text-soft);">'+ev.materiais+'</div>' +
      '</div>' +

      '<div class="panel-block">' +
        '<div class="panel-block-head"><h2>Escala de Bombeiros</h2><button class="btn btn--primary btn--sm" id="btnAddTurno">+ Adicionar Turno</button></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Turno</th><th>Horário Contratado</th><th>Horário Cumprido</th><th>Bombeiro</th><th>Valor</th></tr></thead>' +
        '<tbody id="escTbody">' +
        (lista.length ? lista.map(function(s){
          var t = TURNOS[s.turno];
          return '<tr><td class="num">'+fmtBR(s.data)+'</td><td><span class="pill">'+s.turno+'</span></td>' +
            '<td class="num">'+t.ini+' – '+t.fim+'</td>' +
            '<td class="num">'+(s.cumprido==="—"?'<span style="color:var(--text-faint);">Pendente</span>':s.cumprido)+'</td>' +
            '<td>'+bombeiroNome(s.bombeiroId)+'</td>' +
            '<td class="num">'+fmtMoney(s.valor)+'</td></tr>';
        }).join("") : '<tr><td colspan="6"><div class="empty"><div class="glyph">◇</div><p>Nenhum turno lançado ainda para este evento.</p></div></td></tr>') +
        '</tbody></table></div>' +
      '</div>';

    document.getElementById("btnVoltar").addEventListener("click", function(){ state.eventoDetalheId = null; render(); });
    document.getElementById("btnAddTurno").addEventListener("click", function(){ openFormAddTurno(ev, aptos); });
  }

  function openFormAddTurno(ev, aptos){
    var turnoOptions = Object.keys(TURNOS);
    openDrawer({
      title:"Adicionar Turno", sub:ev.nome, wide:false,
      body:
        '<fieldset><legend>Escala</legend>' +
          field("at_data","Data",'date',fmtISOdefault(ev.inicio),true) +
          fieldSelect("at_turno","Turno",turnoOptions) +
          '<div class="field-hint" id="at_turno_info" style="margin:-8px 0 16px;"></div>' +
          fieldSelectObjs("at_bombeiro","Bombeiro", aptos.map(function(b){ var ap=bombeiroAptidao(b); return {value:b.id, label:b.nome + (ap.level==="warn" ? " (atenção: documento vencendo)" : "")}; })) +
          '<div class="field-hint">Somente bombeiros aptos ou em atenção aparecem aqui — impedidos (documentação vencida) ficam fora da lista.</div>' +
        '</fieldset>',
      footHTML: '<button class="btn btn--ghost" id="fCancel">Cancelar</button><button class="btn btn--primary" id="fSave">Adicionar à Escala</button>'
    });

    function updateInfo(){
      var t = TURNOS[document.getElementById("at_turno").value];
      document.getElementById("at_turno_info").textContent = t.ini+" às "+t.fim+" · "+fmtMoney(t.valor)+" por diária";
    }
    document.getElementById("at_turno").addEventListener("change", updateInfo);
    updateInfo();

    document.getElementById("fCancel").addEventListener("click", closeDrawer);
    document.getElementById("fSave").addEventListener("click", function(){
      var data = document.getElementById("at_data").value;
      var turno = document.getElementById("at_turno").value;
      var bombeiroId = document.getElementById("at_bombeiro").value;
      if(!data || !bombeiroId){ toast("Selecione a data e o bombeiro."); return; }
      escalas.push({id:"s"+(seq.s++), eventoId:ev.id, data:data, turno:turno, bombeiroId:bombeiroId, cumprido:"—", valor:TURNOS[turno].valor});
      closeDrawer();
      renderEventoDetalhe(ev.id);
      toast("Turno adicionado à escala.");
    });
  }

  function fmtISOdefault(iso){ return iso; }

  /* ===================== FINANCEIRO ===================== */
  function renderFinanceiro(){
    var totalFat = eventos.reduce(function(s,e){return s+e.valorFechamento;},0);
    var totalCusto = eventos.reduce(function(s,e){return s+financeiroEvento(e).custoTotal;},0);
    var totalLucro = totalFat - totalCusto;
    var margemMedia = totalFat ? (totalLucro/totalFat*100) : 0;

    main.innerHTML =
      topbarHTML("Financeiro", "Resultado por evento — o que é cobrado do cliente, o que é pago aos bombeiros e a margem líquida.", "") +
      '<div class="kpi-grid">' +
        kpiTile("Faturamento Total", fmtMoney(totalFat), "soma dos fechamentos") +
        kpiTile("Custo Total", fmtMoney(totalCusto), "bombeiros + alimentação") +
        kpiTile("Lucro Bruto Total", fmtMoney(totalLucro), "todos os eventos") +
        kpiTile("Margem Média", margemMedia.toFixed(1)+"%", "sobre faturamento") +
      '</div>' +
      '<div class="panel-block">' +
        '<div class="panel-block-head"><h2>Resultado por Evento</h2><span class="hint">clique num status para atualizar</span></div>' +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th>Evento</th><th>Fechamento</th><th>Pago Bombeiros</th><th>Alimentação</th><th>Custo Total</th><th>Lucro Bruto</th><th>Recebimento Cliente</th><th>Pagamento Bombeiros</th>' +
        '</tr></thead><tbody id="finTbody"></tbody></table></div>' +
      '</div>';
    renderFinTbody();
  }

  function renderFinTbody(){
    var tbody = document.getElementById("finTbody");
    tbody.innerHTML = eventos.map(function(e){
      var f = financeiroEvento(e);
      var extra = financeiroExtra[e.id] || {pagoBombeirosStatus:"Pendente", recebidoClienteStatus:"Pendente"};
      return '<tr>' +
        '<td class="name-cell">'+e.nome+'<span class="sub">'+e.cliente+'</span></td>' +
        '<td class="num">'+fmtMoney(e.valorFechamento)+'</td>' +
        '<td class="num">'+fmtMoney(f.pagoBombeiros)+'</td>' +
        '<td class="num">'+fmtMoney(f.alimentacao)+'</td>' +
        '<td class="num">'+fmtMoney(f.custoTotal)+'</td>' +
        '<td class="num" style="font-weight:700;">'+fmtMoney(f.lucro)+'</td>' +
        '<td><button class="chip chip-btn chip--'+pagStatusLevel(extra.recebidoClienteStatus)+'" data-ev="'+e.id+'" data-kind="receb">'+extra.recebidoClienteStatus+(extra.recebidoClienteData?" · "+fmtBR(extra.recebidoClienteData):"")+'</button></td>' +
        '<td><button class="chip chip-btn chip--'+pagStatusLevel(extra.pagoBombeirosStatus)+'" data-ev="'+e.id+'" data-kind="pgto">'+extra.pagoBombeirosStatus+(extra.pagoBombeirosData?" · "+fmtBR(extra.pagoBombeirosData):"")+'</button></td>' +
      '</tr>';
    }).join("");
    Array.prototype.forEach.call(tbody.querySelectorAll(".chip-btn"), function(btn){
      btn.addEventListener("click", function(){ openFormRegistrarPagamento(btn.getAttribute("data-ev"), btn.getAttribute("data-kind")); });
    });
  }

  function openFormRegistrarPagamento(evId, kind){
    var ev = byId(eventos, evId);
    var isReceb = kind === "receb";
    openDrawer({
      title: isReceb ? "Recebimento do Cliente" : "Pagamento aos Bombeiros",
      sub: ev.nome, wide:false,
      body:
        '<fieldset><legend>Confirmação</legend>' +
          field("rp_data", isReceb ? "Data do Recebimento" : "Data do Pagamento", "date", todayISO(), true) +
        '</fieldset>',
      footHTML: '<button class="btn btn--ghost" id="fCancel">Cancelar</button><button class="btn btn--primary" id="fSave">Confirmar</button>'
    });
    document.getElementById("fCancel").addEventListener("click", closeDrawer);
    document.getElementById("fSave").addEventListener("click", function(){
      var data = document.getElementById("rp_data").value;
      if(!data){ toast("Informe a data."); return; }
      var extra = financeiroExtra[evId];
      if(isReceb){ extra.recebidoClienteData = data; extra.recebidoClienteStatus = "Recebido"; }
      else { extra.pagoBombeirosData = data; extra.pagoBombeirosStatus = "Pago"; }
      closeDrawer();
      renderFinTbody();
      toast("Registro atualizado.");
    });
  }

  function todayISO(){
    var m = TODAY.getMonth()+1, d = TODAY.getDate();
    return TODAY.getFullYear()+"-"+(m<10?"0"+m:m)+"-"+(d<10?"0"+d:d);
  }

  /* ===================== FORM FIELD HELPERS ===================== */
  function field(id,label,type,placeholder,required){
    return '<div class="field"><label for="'+id+'">'+label+'</label>' +
      '<input type="'+type+'" id="'+id+'" placeholder="'+(placeholder||"")+'" '+(required?"required":"")+'></div>';
  }
  function fieldSelect(id,label,options){
    return '<div class="field"><label for="'+id+'">'+label+'</label><select id="'+id+'">' +
      options.map(function(o){return '<option value="'+o+'">'+o+'</option>';}).join("") + '</select></div>';
  }
  function fieldSelectObjs(id,label,options){
    return '<div class="field"><label for="'+id+'">'+label+'</label><select id="'+id+'">' +
      options.map(function(o){return '<option value="'+o.value+'">'+o.label+'</option>';}).join("") + '</select></div>';
  }

  /* ===================== DRAWER / TOAST ===================== */
  var drawer = document.getElementById("drawer");
  var backdrop = document.getElementById("backdrop");
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeDrawer(); });

  function openDrawer(opts){
    document.getElementById("drawerTitle").textContent = opts.title;
    document.getElementById("drawerSub").textContent = opts.sub || "";
    document.getElementById("drawerBody").innerHTML = opts.body;
    document.getElementById("drawerFoot").innerHTML = opts.footHTML;
    drawer.classList.toggle("wide", !!opts.wide);
    drawer.classList.add("open");
    backdrop.classList.add("open");
  }
  function closeDrawer(){
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
  }

  var toastTimer = null;
  function toast(msg){
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove("show"); }, 2600);
  }

  /* ===================== INIT ===================== */
  render();
})();
