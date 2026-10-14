pipeline {
    agent any

    environment {
        IMAGE_NAME = 'game-rental-ci'
        DOCKER_BIN = 'C:\\Users\\Admin\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
    }

    stages {
        stage('Build') {
            steps {
                echo "=========================================="
                echo "STAGE 1: Building Docker Image"
                echo "Image: ${IMAGE_NAME}"
                echo "=========================================="
                bat "\"${DOCKER_BIN}\" build -t ${IMAGE_NAME} ."
            }
        }

        stage('Test') {
            steps {
                echo "=========================================="
                echo "STAGE 2: Running Automated Pytest in Container"
                echo "=========================================="
                bat "\"${DOCKER_BIN}\" run --rm ${IMAGE_NAME} python -m pytest test_app.py"
            }
        }

        stage('Deploy with Ansible') {
            steps {
                echo "=========================================="
                echo "STAGE 3: Deploying Container via Ansible"
                echo "=========================================="
                bat 'wsl bash -lc "cd /mnt/d/Devops-proj && ansible-playbook -i inventory.ini game-deploy.yml"'
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
