# Use official Node.js image with ES Module support
FROM node:18

# Create app directory
WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files (including .env for Gemini API key)
COPY . .

# Ensure uploads folder exists with correct permissions
RUN mkdir -p /app/uploads && chmod -R 755 /app/uploads

# Expose the app's port
EXPOSE 3000

# Set environment variable to allow ESM + dotenv
ENV NODE_ENV=production

# Launch the server
CMD ["node", "server.js"]
