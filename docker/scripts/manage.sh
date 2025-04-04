#!/bin/bash
# Helper script for Docker container operations
set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
API_CONTAINER="metadata-quality-stack_api_1"
FRONTEND_CONTAINER="metadata-quality-stack_frontend_1"
DB_PATH="/app/data/mqa_db.json"

# Functions
function show_help {
    echo "Metadata Quality Stack Management Script"
    echo ""
    echo "Usage:"
    echo "  $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start              - Start the services"
    echo "  stop               - Stop the services"
    echo "  restart            - Restart the services"
    echo "  status             - Check the status of all services"
    echo "  backup             - Create a backup of the database"
    echo "  restore [file]     - Restore database from backup"
    echo "  logs [service]     - Show logs (api, frontend, or all)"
    echo "  clear-data         - Clear all data (warning: destructive)"
    echo "  shell [service]    - Open a shell in a container"
    echo "  rebuild            - Rebuild containers (useful after code changes)"
    echo "  help               - Show this help"
    echo ""
}

function start_services {
    echo "Starting services..."
    cd "$PROJECT_DIR" && docker-compose up -d
    echo "Services started"
}

function stop_services {
    echo "Stopping services..."
    cd "$PROJECT_DIR" && docker-compose down
    echo "Services stopped"
}

function restart_services {
    echo "Restarting services..."
    cd "$PROJECT_DIR" && docker-compose restart
    echo "Services restarted"
}

function check_status {
    echo "Checking service status..."
    cd "$PROJECT_DIR" && docker-compose ps
}

function rebuild_services {
    echo "Rebuilding services..."
    cd "$PROJECT_DIR" && docker-compose down && docker-compose build && docker-compose up -d
    echo "Services rebuilt and started"
}

function backup_db {
    echo "Creating database backup..."
    local backup_file="mqa_db_$(date +%Y%m%d_%H%M%S).json"
    docker exec $API_CONTAINER sh -c "cp $DB_PATH /app/data/$backup_file"
    echo "Backup created: $backup_file in container's data directory"
    
    # Copy to host system if possible
    local backup_dir="$PROJECT_DIR/backups"
    mkdir -p "$backup_dir"
    docker cp "$API_CONTAINER:/app/data/$backup_file" "$backup_dir/"
    echo "Backup also copied to: $backup_dir/$backup_file"
}

function restore_db {
    if [ -z "$1" ]; then
        echo "Error: Backup file must be specified"
        exit 1
    fi
    
    local source_file="$1"
    local is_local_file=false
    
    # Check if the file exists locally
    if [ -f "$PROJECT_DIR/backups/$source_file" ]; then
        echo "Found local backup file: $PROJECT_DIR/backups/$source_file"
        docker cp "$PROJECT_DIR/backups/$source_file" "$API_CONTAINER:/app/data/$source_file"
        is_local_file=true
    fi
    
    echo "Restoring database from $source_file..."
    if $is_local_file || docker exec $API_CONTAINER test -f "/app/data/$source_file"; then
        docker exec $API_CONTAINER sh -c "cp /app/data/$source_file $DB_PATH"
        echo "Database restored successfully"
    else
        echo "Error: Backup file not found in container or local backup directory"
        exit 1
    fi
}

function show_logs {
    if [ -z "$1" ]; then
        echo "Showing logs for all services..."
        cd "$PROJECT_DIR" && docker-compose logs -f
    else
        echo "Showing logs for $1..."
        cd "$PROJECT_DIR" && docker-compose logs -f $1
    fi
}

function clear_data {
    echo "WARNING: This will delete all stored data."
    read -p "Are you sure you want to continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Clearing database..."
        docker exec $API_CONTAINER sh -c "rm -f $DB_PATH && touch $DB_PATH && echo '{}' > $DB_PATH"
        echo "Data cleared"
    else
        echo "Operation cancelled"
    fi
}

function open_shell {
    if [ -z "$1" ]; then
        echo "Error: Service must be specified (api or frontend)"
        exit 1
    fi
    
    local container=""
    if [ "$1" == "api" ]; then
        container=$API_CONTAINER
    elif [ "$1" == "frontend" ]; then
        container=$FRONTEND_CONTAINER
    else
        echo "Error: Unknown service '$1'"
        exit 1
    fi
    
    echo "Opening shell in $1 container..."
    docker exec -it $container bash
}

# Main execution
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        check_status
        ;;
    rebuild)
        rebuild_services
        ;;
    backup)
        backup_db
        ;;
    restore)
        restore_db "$2"
        ;;
    logs)
        show_logs "$2"
        ;;
    clear-data)
        clear_data
        ;;
    shell)
        open_shell "$2"
        ;;
    help|"")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

exit 0