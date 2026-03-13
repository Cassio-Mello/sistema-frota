let db = { viagens: [] }

function salvar() {

    localStorage.setItem("frota", JSON.stringify(db))

}

function carregar() {

    let d = localStorage.getItem("frota")

    if (d) {

        db = JSON.parse(d)

    }

}

carregar()