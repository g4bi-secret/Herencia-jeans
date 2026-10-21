require('dotenv').config();
const express = require('express');
const path = require('path');
const Stripe = require('stripe');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.get('/cancel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cancel.html'));
});

app.post('/api/create-checkout-session', async (req, res) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const { items = [] } = req.body || {};

  if (!stripeSecretKey) {
    return res.status(400).json({
      error: 'STRIPE_SECRET_KEY no está configurada. Agrega tu clave secreta de Stripe en el archivo .env.'
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Debes enviar al menos un producto en el arreglo items.'
    });
  }

  try {
    const stripe = new Stripe(stripeSecretKey);

    const validItems = items.map((item) => {
      const name = String(item.name || 'Producto Herencia Jeans');
      const quantity = Number(item.quantity) || 1;
      const unitAmount = Number(item.unit_amount) || 0;

      if (unitAmount <= 0) {
        throw new Error(`El precio del producto "${name}" debe ser mayor a 0.`);
      }

      return {
        price_data: {
          currency: 'clp',
          product_data: {
            name
          },
          unit_amount: Math.round(unitAmount)
        },
        quantity: Math.max(1, quantity)
      };
    });

    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: validItems,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        source: 'herencia-jeans-store'
      }
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Error al crear la sesión de Stripe:', error);
    return res.status(500).json({
      error: error.message || 'No se pudo crear la sesión de pago.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Herencia Jeans escuchando en http://localhost:${PORT}`);
});
