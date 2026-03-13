let chart

function atualizarDashboard() {

    let frete = 0
    let despesas = 0

    db.viagens.forEach(v => {

        frete += v.frete

        despesas += v.despesas.reduce((t, d) => t + d.valor, 0)

    })

    let lucro = frete - despesas

    viagensTotal.innerText = db.viagens.length
    freteTotal.innerText = "R$ " + frete
    despesasTotal.innerText = "R$ " + despesas
    lucroTotal.innerText = "R$ " + lucro

    if (chart) chart.destroy()

    let ctx = document.getElementById("graficoFinanceiro")

    chart = new Chart(ctx, {

        type: "bar",

        data: {
            labels: ["Frete", "Despesas", "Lucro"],
            datasets: [{

                label: "Financeiro",
                data: [frete, despesas, lucro]

            }]
        }

    })

}