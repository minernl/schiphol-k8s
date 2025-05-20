FROM python:3.13-slim

# Set the working directory in the container
WORKDIR /app

# Copy the Python script into the container
COPY safesecrets-controller.py .

# Install required dependencies
RUN pip install kubernetes

# Run the Python script
CMD ["python", "safesecrets-controller.py"]
