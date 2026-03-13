function gerarPDF(id) {

    const { jsPDF } = window.jspdf

    let v = db.viagens.find(x => x.id == id)

    let doc = new jsPDF()

    doc.text("Relatório de Viagem", 20, 20)

    doc.text("Motorista: " + v.motorista, 20, 40)

    doc.text("Placa: " + v.placa, 20, 50)

    doc.text("Frete: " + v.frete, 20, 60)

    doc.save("viagem.pdf")

}