const net = require('net');

// Store all client connections
const clients = [];

// Create a chat server
const server = net.createServer((socket) => {
  // Generate a client ID
  const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`Client connected: ${clientId}`);
  
  // Set encoding
  socket.setEncoding('utf8');
  
  // Add client to the list
  clients.push(socket);
  
  // Send welcome message
  socket.write(`Welcome to the chat server! There are ${clients.length} users online.\r\n`);
  
  // Broadcast message to all clients except the sender
  function broadcast(message, sender) {
    clients.forEach(client => {
      if (client !== sender) {
        client.write(message);
      }
    });
  }
  
  // Notify all clients about the new connection
  broadcast(`User ${clientId} joined the chat.\r\n`, socket);
  
  // Handle client messages
  socket.on('data', (data) => {
    console.log(`${clientId}: ${data.trim()}`);
    
    // Broadcast the message to all other clients
    broadcast(`${clientId}: ${data}`, socket);
  });
  
  // Handle client disconnection
  socket.on('end', () => {
    console.log(`Client disconnected: ${clientId}`);
    
    // Remove client from the list
    const index = clients.indexOf(socket);
    if (index !== -1) {
      clients.splice(index, 1);
    }
    
    // Notify all clients about the disconnection
    broadcast(`User ${clientId} left the chat.\r\n`, null);
  });
  
  // Handle errors
  socket.on('error', (err) => {
    console.error(`Socket error from ${clientId}:`, err);
  });
});

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});