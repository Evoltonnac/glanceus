SHELL := /bin/bash

.PHONY: help dev dev-tauri dev-e2e dev-e2e-clean dev-e2e-app dev-e2e-mocks build-backend build-mac build-win build-desktop test test-backend test-frontend test-typecheck test-impacted test-midscene test-midscene-critical gen-schemas clean-artifacts

help:
	@echo "Available targets:"
	@echo "  make dev                    # Start backend + web frontend"
	@echo "  make dev-tauri              # Start backend + Tauri dev app"
	@echo "  make dev-e2e                # Start complete E2E runtime: app + mock services"
	@echo "  make dev-e2e-clean          # Clean isolated E2E data, then start full E2E runtime"
	@echo "  make dev-e2e-app            # Start isolated E2E app only, without mocks"
	@echo "  make dev-e2e-mocks          # Start E2E mock services only"
	@echo "  make build-backend          # Build Python backend sidecar archive only"
	@echo "  make build-mac              # Build macOS arm64 desktop package (.dmg)"
	@echo "  make build-win              # Build Windows x64 desktop package (.exe)"
	@echo "  make test                   # Run backend + frontend core tests"
	@echo "  make test-backend           # Run backend core tests"
	@echo "  make test-frontend          # Run frontend core tests"
	@echo "  make test-typecheck         # Run frontend tests with typecheck"
	@echo "  make test-impacted          # Run impacted-only gate by changed files"
	@echo "  make test-midscene          # Run Midscene AI E2E tests (requires .env with MIDSCENE_*)"
	@echo "  make test-midscene-critical # Run focused Midscene critical-path E2E spec"
	@echo "  make gen-schemas            # Generate integration schema artifacts"
	@echo "  make clean-artifacts        # Remove generated build artifacts"

dev:
	pnpm --dir ui-react run dev:all

dev-tauri:
	pnpm --dir ui-react run tauri:dev:all

dev-e2e:
	pnpm --dir ui-react run dev:e2e

dev-e2e-clean:
	pnpm --dir ui-react run dev:e2e:clean

dev-e2e-app:
	pnpm --dir ui-react run dev:e2e:app

dev-e2e-mocks:
	pnpm --dir ui-react run dev:e2e:mocks

build-backend:
	bash scripts/build.sh --prepare-only

build-mac:
	pnpm --dir ui-react run tauri:build:mac

build-win:
	pnpm --dir ui-react run tauri:build:win

build-desktop:
	@echo "build-desktop is deprecated. Use make build-mac or make build-win."
	pnpm --dir ui-react run tauri:build

test-backend:
	bash scripts/test_backend_core.sh

test-frontend:
	bash scripts/test_frontend_core.sh

test-typecheck:
	bash scripts/test_frontend_core.sh --with-typecheck

test-impacted:
	bash scripts/test_impacted.sh

test-midscene:
	pnpm --dir ui-react run test:midscene:clean

test-midscene-critical:
	pnpm --dir ui-react run test:midscene:critical

gen-schemas:
	python scripts/generate_schemas.py

test: test-backend test-frontend

clean-artifacts:
	bash scripts/clean_artifacts.sh
