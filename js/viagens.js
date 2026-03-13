function criarViagem() {

    let v = {

        id: Date.now(),

        motorista: document.getElementById("motorista").value,

        placa: document.getElementById("placa").value,

        origem: document.getElementById("origem").value,

        destino: document.getElementById("destino").value,

        kmInicial: Number(document.getElementById("hodometro").value),

        frete: Number(document.getElementById("frete").value),

        despesas: [],

        status: "EM VIAGEM"

    }

    db.viagens.push(v)

    salvar()

    fecharModal()

    render()

}

function adicionarDespesa(id) {

    let valor = Number(prompt("Valor despesa"))

    let v = db.viagens.find(x => x.id == id)

    v.despesas.push(valor)

    salvar()

    render()

}

function encerrar(id) {

    let v = db.viagens.find(x => x.id == id)

    v.status = "FINALIZADA"

    salvar()

    render()

}