FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project
COPY . .

# Expose port (Vite default is 3000 as configured in vite.config.js)
EXPOSE 3000

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
