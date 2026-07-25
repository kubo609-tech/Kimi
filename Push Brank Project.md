# GitHubへのプッシュ手順

前提として、GitHubアカウントとGitのインストールが済んでいるとします。

## 1. GitHubで空のリポジトリを作成

1. GitHub にログイン
2. 右上の「+」→「New repository」
3. リポジトリ名を入力(例: `my-game`)
4. **README、.gitignore、ライセンスは追加しない**(空のまま作成、これが重要)
5. 「Create repository」をクリック

作成後、以下のようなURLが表示されます:
```
https://github.com/ユーザー名/my-game.git
```

## 2. ローカルのプロジェクトフォルダで初期化

ゲームのファイルがあるフォルダをターミナル(またはVS Codeのターミナル)で開き、以下を実行:

```bash
cd path/to/your-game-folder
git init
```

## 3. .gitignore を用意(任意だが推奨)

不要なファイル(node_modules、ビルド成果物など)を除外したい場合は `.gitignore` を作成します。使用言語や環境を教えてもらえれば、適切な内容を用意できます。

## 4. ファイルをステージングしてコミット

```bash
git add .
git commit -m "Initial commit: ゲームの初回コミット"
```

## 5. リモートリポジトリを紐付ける

```bash
git remote add origin https://github.com/ユーザー名/my-game.git
```

## 6. ブランチ名を確認してプッシュ

```bash
git branch -M main
git push -u origin main
```

初回プッシュ時に認証を求められます。パスワード入力は現在サポートされていないため、**Personal Access Token(PAT)** か、VS Code連携なら **GitHub CLI(`gh auth login`)** での認証が必要です。

---

もしすでにVS Code上でGitHub Copilotを使っている場合は、VS Code左側の「ソース管理」パネルから、GUIでコミット・プッシュも可能です(コマンド操作が不要になります)。

使用している言語やフレームワーク(例: HTML/JS、Unityなど)を教えていただければ、.gitignoreの中身や注意点をもう少し具体的にお伝えできます。

# ローカルのフォルダからそのままGitHubに新規リポジトリを作成してプッシュ

VS Codeには「Publish to GitHub」という機能があり、リモート側で空リポジトリを事前に作らなくても、ローカルのフォルダからそのままGitHubに新規リポジトリを作成してプッシュできます。

## 手順

### 1. ソース管理パネルを開く
左側のアクティビティバーから「ソース管理」アイコン(枝分かれしたようなアイコン)をクリック。

### 2. まだGitが初期化されていない場合
「Initialize Repository」ボタンが表示されるのでクリック(これで `git init` 相当の処理が行われます)。

### 3. ファイルをコミット
- 変更したファイルが一覧表示されるので、コミットメッセージを入力欄に書く
- 「✓ Commit」(またはチェックマークボタン)をクリック
- 初回はステージされていないファイルも一括コミットするか確認されるので「Yes」を選択

### 4. Publish to GitHub
コミット後、「Publish to GitHub」というボタンが表示されるのでクリックします。

- 初回利用時はGitHubアカウントへのサインインを求められます(ブラウザ経由の認証、または GitHub CLI連携)
- 「Publish to GitHub public repository」か「Publish to GitHub private repository」を選択
- リポジトリ名を確認・編集(デフォルトはフォルダ名)
- 実行すると、VS CodeがGitHub側に自動でリポジトリを作成し、リモート追加・プッシュまで一括で行ってくれます

### 5. 完了確認
GitHub上でリポジトリが作成され、ファイルがアップロードされていれば成功です。画面右下の通知や、ソース管理パネルから「Open on GitHub」でブラウザ確認もできます。

---

**補足:**
- 「GitHub Pull Requests and Issues」拡張機能を入れていると、この機能がより安定して動作します(未インストールなら拡張機能タブで検索してインストールを推奨)
- 2回目以降、別プロジェクトでも同じ手順で新規リポジトリを作れます
- 既存のGitHubリポジトリに紐付けたい場合は、この「Publish」ではなく手動で `git remote add origin ...` する方法になります

もし「Publish to GitHub」ボタンが表示されない場合は、拡張機能の状態を確認しますので教えてください。

# GitLabへのプッシュ手順

GitLabの場合、VS CodeにGitHub連携のような「ワンクリック公開」機能は標準では入っていないため、基本的には**GitLab側で先にリポジトリ(プロジェクト)を作成**してから、ローカルと紐付ける流れになります。

## 方法1: GitLab上で手動作成してVS Codeから紐付け(確実な方法)

### 1. GitLabで空のプロジェクトを作成

1. [GitLab](https://gitlab.com) にログイン
2. 左上「New project」→「Create blank project」
3. プロジェクト名を入力(例: `my-game`)
4. Visibility Level(Public / Private / Internal)を選択
5. **「Initialize repository with a README」のチェックは外す**(空のまま作成。すでにローカルにコミットがあるため)
6. 「Create project」をクリック

作成後、リポジトリURLが表示されます:
```
https://gitlab.com/ユーザー名/my-game.git
```

### 2. VS Codeのターミナルでリモートを追加

すでにGit初期化・コミット済みなので、リモートを追加するだけです。

```bash
git remote add origin https://gitlab.com/ユーザー名/my-game.git
git push -u origin main
```

初回はGitLabの認証(Personal Access TokenまたはSSH鍵)が必要です。

### 3. 認証設定(初回のみ)

- **HTTPS + PAT方式**: GitLab の「Settings」→「Access Tokens」でPersonal Access Tokenを発行し、パスワード入力欄にそれを使う
- **SSH方式**: `git remote add origin git@gitlab.com:ユーザー名/my-game.git` の形式でSSH鍵を使う(事前にSSH鍵をGitLabに登録)

---

## 方法2: 「GitLab Workflow」拡張機能を使う

VS Code拡張機能「**GitLab Workflow**」(gitlab.gitlab-workflow)をインストールすると、GitLabへのサインインやMR作成などがVS Code上で便利になりますが、**GitHubの「Publish to GitHub」のような新規プロジェクト自動作成機能は現状ありません**。そのため、結局は方法1のように先にGitLab側でプロジェクトを作る必要があります。

---

## まとめ

| 項目 | GitHub | GitLab |
|---|---|---|
| VS Code上でワンクリック新規作成 | ○ 可能 | × 不可 |
| 事前にWeb上でリポジトリ作成 | 不要な場合あり | 必要 |
| プッシュ手順 | 同じ(`remote add` → `push`) | 同じ |

GitLabのアカウントをまだお持ちでなければ、その作成方法からもご案内できます。必要であれば教えてください。