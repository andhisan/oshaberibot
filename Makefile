# Redisだけ起動する
up:
	docker compose up -d

# botをエミュレーションする場合
emulate:
	docker compose --profile emulate up -d

# コンテナの終了
down:
	docker compose down --remove-orphans
	docker compose --profile emulate down --remove-orphans

# エミュレーション環境を再起動する
reload:
	@make down
	@make build
	docker compose --profile emulate up -d

# エミュレーション環境を再ビルドする
reload-build:
	@make down
	@make build
	docker compose --profile emulate up -d --build

build:
	npm run build
