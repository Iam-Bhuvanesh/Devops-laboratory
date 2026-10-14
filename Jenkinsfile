pipeline {
    agent any

    environment {
        IMAGE_NAME = 'game-rental-ci'
        ANSIBLE_CONTAINER = 'ansible-docker-lab'
        PLAYBOOK_PATH = '/game-deploy.yml'
        INVENTORY_PATH = '/inventory.ini'
    }

    stages {
        stage('Build') {
            steps {
                echo "=========================================="
                echo "STAGE 1: Building Docker Image"
                echo "Image: ${IMAGE_NAME}"
                echo "=========================================="
                bat "docker build -t ${IMAGE_NAME} ."
            }
        }

        stage('Test') {
            steps {
                echo "=========================================="
                echo "STAGE 2: Running Automated Pytest in Container"
                echo "=========================================="
                bat "docker run --rm ${IMAGE_NAME} python -m pytest test_app.py"
            }
        }

        stage('Deploy with Ansible') {
            steps {
                echo "=========================================="
                echo "STAGE 3: Deploying Container via Ansible"
                echo "Executing Playbook: ${PLAYBOOK_PATH} in ${ANSIBLE_CONTAINER}"
                echo "=========================================="
                bat "docker exec ${ANSIBLE_CONTAINER} ansible-playbook -i ${INVENTORY_PATH} ${PLAYBOOK_PATH}"
            }
        }
    }

    post {
        success {
            echo "SUCCESS: Game Rental CI/CD Pipeline Completed Successfully!"
        }
        failure {
            echo "FAILURE: Game Rental CI/CD Pipeline Failed!"
        }
    }
}
