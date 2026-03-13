function abrirModal() {

    modal.style.display = "flex"

}

function fecharModal() {

    modal.style.display = "none"

}

function render() {

    let tabela = document.getElementById("tabela")

    tabela.innerHTML = ""

    let frete = 0
    let despesas = 0

    db.viagens.forEach(v => {

        frete += v.frete

        despesas += v.despesas.reduce((a, b) => a + b, 0)

        tabela.innerHTML += `

<tr>

<td>${v.motorista}</td>

<td>${v.placa}</td>

<td>${v.origem}</td>

<td>${v.destino}</td>

<td>${v.frete}</td>

<td>${v.status}</td>

<td>

<button onclick="adicionarDespesa(${v.id})">Despesa</button>

<button onclick="encerrar(${v.id})">Encerrar</button>

<button onclick="gerarPDF(${v.id})">PDF</button>

</td>

</tr>

`

    })

    let lucro = frete - despesas

    totalViagens.innerText = db.viagens.length

    totalFrete.innerText = "R$ " + frete

    totalDespesas.innerText = "R$ " + despesas

    totalLucro.innerText = "R$ " + lucro

}

render()