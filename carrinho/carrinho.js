// Executa assim que o arquivo HTML do carrinho termina de carregar
document.addEventListener("DOMContentLoaded", () => {
    carregarItensCarrinho();
});

function carregarItensCarrinho() {
    const listaDiv = document.getElementById('cart-products-list');
    listaDiv.innerHTML = '';
    
    // Alerta caso o carrinho esteja completamente vazio
    if (!cart || cart.length === 0) {
        listaDiv.innerHTML = '<p style="color: #b2bec3; padding: 10px 0;">Seu carrinho está vazio.</p>';
        atualizarResumoValores();
        return;
    }

    // Varre a lista de produtos adicionados
    cart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <div class="item-info">
                <h3>${item.name}</h3>
                <p>R$ ${item.price.toFixed(2)}</p>
            </div>
            <button class="btn-remove" onclick="removerItemCarrinho(${index})">Remover</button>
        `;
        listaDiv.appendChild(row);
    });

    atualizarResumoValores();
}

function removerItemCarrinho(index) {
    cart.splice(index, 1); // Remove o item do array global localizado no app.js
    updateCartUI();        // Sincroniza a interface
    carregarItensCarrinho(); // Recarrega a listagem visual do carrinho
}

function atualizarResumoValores() {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('subtotal-value').innerText = `R$ ${subtotal.toFixed(2)}`;
    
    const freteTexto = document.getElementById('delivery-cost');
    const totalTexto = document.getElementById('total-value');

    if (deliveryValida) {
        freteTexto.innerText = "Grátis (Moto)";
        freteTexto.style.color = "var(--success)";
        totalTexto.innerText = `R$ ${subtotal.toFixed(2)}`;
    } else {
        freteTexto.innerText = "A calcular";
        freteTexto.style.color = "inherit";
        totalTexto.innerText = `R$ ${subtotal.toFixed(2)}`;
    }
}

// Vincula dinamicamente a checagem do CEP à atualização financeira da lateral
const funcaoCepOriginal = verificarCepEntrega;
verificarCepEntrega = async function() {
    await funcaoCepOriginal();
    atualizarResumoValores();
};