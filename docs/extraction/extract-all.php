<?php
/**
 * Script Master de Extração Laravel
 * 
 * Executa todos os scripts de extração em sequência e gera
 * um resumo completo do projeto para migração NestJS.
 */

// Verificar se está sendo executado no contexto correto
if (!file_exists('vendor/autoload.php')) {
    die("❌ Erro: Execute este script na raiz do projeto Laravel\n");
}

require_once 'vendor/autoload.php';

// Incluir scripts de extração
require_once __DIR__ . '/extract-routes.php';
require_once __DIR__ . '/extract-controllers.php';
require_once __DIR__ . '/extract-models.php';

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class MasterExtractor 
{
    private $extractionStartTime;
    private $outputDir;
    
    public function __construct() 
    {
        $this->extractionStartTime = microtime(true);
        $this->outputDir = base_path('docs/extraction');
        
        // Criar diretório de extração se não existir
        if (!is_dir($this->outputDir)) {
            mkdir($this->outputDir, 0755, true);
        }
    }
    
    /**
     * Executa extração completa do projeto
     */
    public function extractAll(): array 
    {
        echo "🚀 INICIANDO EXTRAÇÃO COMPLETA DO PROJETO LARAVEL\n";
        echo "═══════════════════════════════════════════════════\n";
        echo "📍 Projeto: " . config('app.name', 'Laravel App') . "\n";
        echo "📍 Ambiente: " . config('app.env') . "\n";
        echo "📍 Timestamp: " . date('Y-m-d H:i:s') . "\n\n";
        
        $extractedData = [];
        
        try {
            // 1. Extrair Rotas
            echo "📍 [1/6] Extraindo rotas...\n";
            $routeExtractor = new RouteExtractor();
            $routes = $routeExtractor->extractDetailedRoutes();
            $this->saveJson('routes-detailed', $routes);
            $extractedData['routes'] = $routes;
            echo "   ✅ " . count($routes['routes']) . " rotas extraídas\n\n";
            
            // 2. Extrair Controllers
            echo "🎛️ [2/6] Analisando controllers...\n";
            $controllerExtractor = new ControllerExtractor();
            $controllers = $controllerExtractor->extractAllControllers();
            $this->saveJson('controllers-analysis', $controllers);
            $extractedData['controllers'] = $controllers;
            echo "   ✅ " . count($controllers['controllers']) . " controllers analisados\n\n";
            
            // 3. Extrair Models
            echo "🗃️ [3/6] Analisando models...\n";
            $modelExtractor = new ModelExtractor();
            $models = $modelExtractor->extractAllModels();
            $this->saveJson('models-analysis', $models);
            $extractedData['models'] = $models;
            echo "   ✅ " . count($models['models']) . " models analisados\n\n";
            
            // 4. Extrair Schema do Banco
            echo "🗄️ [4/6] Extraindo schema do banco...\n";
            $schema = $this->extractDatabaseSchema();
            $this->saveJson('database-schema', $schema);
            $extractedData['database'] = $schema;
            echo "   ✅ " . count($schema['tables']) . " tabelas analisadas\n\n";
            
            // 5. Extrair Middleware
            echo "🛡️ [5/6] Analisando middleware...\n";
            $middleware = $this->extractMiddleware();
            $this->saveJson('middleware-analysis', $middleware);
            $extractedData['middleware'] = $middleware;
            echo "   ✅ " . count($middleware['middleware_files']) . " middleware analisados\n\n";
            
            // 6. Gerar Resumo
            echo "📊 [6/6] Gerando resumo e análises...\n";
            $summary = $this->generateSummary($extractedData);
            $this->saveJson('extraction-summary', $summary);
            $extractedData['summary'] = $summary;
            echo "   ✅ Resumo completo gerado\n\n";
            
            // Estatísticas finais
            $this->displayFinalStatistics($extractedData);
            
            return $extractedData;
            
        } catch (Exception $e) {
            echo "❌ ERRO DURANTE EXTRAÇÃO: " . $e->getMessage() . "\n";
            echo "📍 Arquivo: " . $e->getFile() . "\n";
            echo "📍 Linha: " . $e->getLine() . "\n";
            throw $e;
        }
    }
    
    /**
     * Extrai schema do banco de dados
     */
    private function extractDatabaseSchema(): array 
    {
        echo "   🔍 Conectando ao banco de dados...\n";
        
        try {
            $tables = Schema::getTableListing();
            $schema = [
                'database_name' => config('database.connections.mysql.database'),
                'connection' => config('database.default'),
                'extraction_timestamp' => date('Y-m-d H:i:s'),
                'total_tables' => count($tables),
                'tables' => [],
                'indexes' => [],
                'foreign_keys' => []
            ];
            
            echo "   📋 Analisando " . count($tables) . " tabelas...\n";
            
            foreach ($tables as $table) {
                echo "      - {$table}\n";
                
                $tableInfo = [
                    'name' => $table,
                    'columns' => $this->getTableColumns($table),
                    'indexes' => $this->getTableIndexes($table),
                    'foreign_keys' => $this->getTableForeignKeys($table),
                    'engine' => $this->getTableEngine($table),
                    'collation' => $this->getTableCollation($table),
                    'row_count' => $this->getTableRowCount($table)
                ];
                
                $schema['tables'][$table] = $tableInfo;
            }
            
            return $schema;
            
        } catch (Exception $e) {
            echo "   ⚠️ Erro ao extrair schema: " . $e->getMessage() . "\n";
            return [
                'error' => $e->getMessage(),
                'extraction_timestamp' => date('Y-m-d H:i:s'),
                'tables' => []
            ];
        }
    }
    
    /**
     * Obtém colunas da tabela
     */
    private function getTableColumns(string $table): array 
    {
        try {
            $columns = Schema::getColumnListing($table);
            $columnDetails = [];
            
            foreach ($columns as $column) {
                $columnInfo = DB::select("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'")[0];
                
                $columnDetails[] = [
                    'name' => $column,
                    'type' => $columnInfo->Type,
                    'nullable' => $columnInfo->Null === 'YES',
                    'default' => $columnInfo->Default,
                    'key' => $columnInfo->Key,
                    'extra' => $columnInfo->Extra
                ];
            }
            
            return $columnDetails;
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Obtém índices da tabela
     */
    private function getTableIndexes(string $table): array 
    {
        try {
            $indexes = DB::select("SHOW INDEX FROM `{$table}`");
            $indexDetails = [];
            
            foreach ($indexes as $index) {
                $indexDetails[] = [
                    'name' => $index->Key_name,
                    'column' => $index->Column_name,
                    'unique' => !$index->Non_unique,
                    'type' => $index->Index_type
                ];
            }
            
            return $indexDetails;
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Obtém chaves estrangeiras da tabela
     */
    private function getTableForeignKeys(string $table): array 
    {
        try {
            $database = config('database.connections.mysql.database');
            
            $foreignKeys = DB::select("
                SELECT 
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME,
                    CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = ? 
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ", [$database, $table]);
            
            $fkDetails = [];
            
            foreach ($foreignKeys as $fk) {
                $fkDetails[] = [
                    'column' => $fk->COLUMN_NAME,
                    'referenced_table' => $fk->REFERENCED_TABLE_NAME,
                    'referenced_column' => $fk->REFERENCED_COLUMN_NAME,
                    'constraint_name' => $fk->CONSTRAINT_NAME
                ];
            }
            
            return $fkDetails;
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Obtém engine da tabela
     */
    private function getTableEngine(string $table): ?string 
    {
        try {
            $database = config('database.connections.mysql.database');
            
            $result = DB::select("
                SELECT ENGINE 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ", [$database, $table]);
            
            return $result[0]->ENGINE ?? null;
            
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Obtém collation da tabela
     */
    private function getTableCollation(string $table): ?string 
    {
        try {
            $database = config('database.connections.mysql.database');
            
            $result = DB::select("
                SELECT TABLE_COLLATION 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ", [$database, $table]);
            
            return $result[0]->TABLE_COLLATION ?? null;
            
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Obtém contagem de linhas da tabela
     */
    private function getTableRowCount(string $table): int 
    {
        try {
            $result = DB::select("SELECT COUNT(*) as count FROM `{$table}`");
            return $result[0]->count ?? 0;
            
        } catch (Exception $e) {
            return 0;
        }
    }
    
    /**
     * Extrai middleware do projeto
     */
    private function extractMiddleware(): array 
    {
        echo "   🔍 Analisando middleware do projeto...\n";
        
        $middlewareData = [
            'extraction_timestamp' => date('Y-m-d H:i:s'),
            'middleware_files' => [],
            'kernel_middleware' => $this->extractKernelMiddleware(),
            'route_middleware' => $this->extractRouteMiddleware(),
            'middleware_groups' => $this->extractMiddlewareGroups()
        ];
        
        // Analisar arquivos de middleware
        $middlewarePath = app_path('Http/Middleware');
        
        if (is_dir($middlewarePath)) {
            $middlewareFiles = glob($middlewarePath . '/*.php');
            
            foreach ($middlewareFiles as $file) {
                echo "      - " . basename($file) . "\n";
                
                $middlewareInfo = $this->analyzeMiddlewareFile($file);
                if ($middlewareInfo) {
                    $middlewareData['middleware_files'][] = $middlewareInfo;
                }
            }
        }
        
        return $middlewareData;
    }
    
    /**
     * Extrai middleware do Kernel
     */
    private function extractKernelMiddleware(): array 
    {
        try {
            $kernelPath = app_path('Http/Kernel.php');
            
            if (!file_exists($kernelPath)) {
                return [];
            }
            
            $content = file_get_contents($kernelPath);
            
            $middleware = [
                'global' => $this->extractMiddlewareFromKernel($content, 'middleware'),
                'groups' => $this->extractMiddlewareFromKernel($content, 'middlewareGroups'),
                'route' => $this->extractMiddlewareFromKernel($content, 'routeMiddleware')
            ];
            
            return $middleware;
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Extrai middleware de rotas
     */
    private function extractRouteMiddleware(): array 
    {
        try {
            $routeFiles = [
                'web' => base_path('routes/web.php'),
                'api' => base_path('routes/api.php')
            ];
            
            $routeMiddleware = [];
            
            foreach ($routeFiles as $type => $file) {
                if (file_exists($file)) {
                    $content = file_get_contents($file);
                    $routeMiddleware[$type] = $this->extractMiddlewareFromRoutes($content);
                }
            }
            
            return $routeMiddleware;
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Extrai grupos de middleware
     */
    private function extractMiddlewareGroups(): array 
    {
        try {
            $kernelPath = app_path('Http/Kernel.php');
            
            if (!file_exists($kernelPath)) {
                return [];
            }
            
            $content = file_get_contents($kernelPath);
            
            if (preg_match('/protected\s+\$middlewareGroups\s*=\s*\[(.*?)\];/s', $content, $matches)) {
                return $this->parseMiddlewareArray($matches[1]);
            }
            
            return [];
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Analisa arquivo de middleware
     */
    private function analyzeMiddlewareFile(string $filePath): ?array 
    {
        try {
            $content = file_get_contents($filePath);
            
            return [
                'file' => str_replace(base_path() . '/', '', $filePath),
                'class_name' => $this->extractClassName($content),
                'namespace' => $this->extractNamespace($content),
                'handle_method' => $this->analyzeHandleMethod($content),
                'dependencies' => $this->extractDependencies($content),
                'implements_contracts' => $this->checkMiddlewareContracts($content)
            ];
            
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Analisa método handle do middleware
     */
    private function analyzeHandleMethod(string $content): array 
    {
        $handleInfo = [
            'exists' => false,
            'parameters' => [],
            'logic_summary' => []
        ];
        
        if (preg_match('/public\s+function\s+handle\s*\(([^)]*)\)/', $content, $matches)) {
            $handleInfo['exists'] = true;
            $handleInfo['parameters'] = $this->parseMethodParameters($matches[1]);
            
            // Analisar lógica básica
            if (preg_match('/function\s+handle[^{]*\{(.*?)(?=function|\}$)/s', $content, $bodyMatch)) {
                $body = $bodyMatch[1];
                
                if (strpos($body, '$next($request)') !== false) {
                    $handleInfo['logic_summary'][] = 'Calls next middleware';
                }
                
                if (preg_match('/return\s+response\(\)/', $body)) {
                    $handleInfo['logic_summary'][] = 'Returns response directly';
                }
                
                if (preg_match('/abort\(|throw\s+new/', $body)) {
                    $handleInfo['logic_summary'][] = 'Can abort request';
                }
            }
        }
        
        return $handleInfo;
    }
    
    /**
     * Verifica contratos de middleware
     */
    private function checkMiddlewareContracts(string $content): array 
    {
        $contracts = [];
        
        if (preg_match('/implements\s+([^{]+)/', $content, $matches)) {
            $implementsList = explode(',', $matches[1]);
            foreach ($implementsList as $contract) {
                $contracts[] = trim($contract);
            }
        }
        
        return $contracts;
    }
    
    /**
     * Métodos auxiliares reutilizados
     */
    private function extractClassName(string $content): ?string 
    {
        if (preg_match('/class\s+(\w+)/', $content, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    private function extractNamespace(string $content): ?string 
    {
        if (preg_match('/namespace\s+([^;]+);/', $content, $matches)) {
            return trim($matches[1]);
        }
        return null;
    }
    
    private function extractDependencies(string $content): array 
    {
        $dependencies = [];
        
        preg_match_all('/use\s+([^;]+);/', $content, $matches);
        
        foreach ($matches[1] as $import) {
            $dependencies[] = trim($import);
        }
        
        return $dependencies;
    }
    
    private function parseMethodParameters(string $parametersString): array 
    {
        $parameters = [];
        
        if (empty(trim($parametersString))) {
            return $parameters;
        }
        
        $paramList = explode(',', $parametersString);
        
        foreach ($paramList as $param) {
            $param = trim($param);
            
            if (preg_match('/(?:([^\s]+)\s+)?\$(\w+)/', $param, $matches)) {
                $parameters[] = [
                    'type' => isset($matches[1]) ? trim($matches[1]) : null,
                    'name' => $matches[2]
                ];
            }
        }
        
        return $parameters;
    }
    
    /**
     * Gera resumo completo
     */
    private function generateSummary(array $extractedData): array 
    {
        $executionTime = microtime(true) - $this->extractionStartTime;
        
        $summary = [
            'extraction_metadata' => [
                'extraction_date' => date('Y-m-d H:i:s'),
                'execution_time_seconds' => round($executionTime, 2),
                'laravel_version' => app()->version(),
                'php_version' => PHP_VERSION,
                'database_connection' => config('database.default'),
                'app_environment' => config('app.env')
            ],
            'project_statistics' => [
                'total_routes' => $extractedData['routes']['total_routes'] ?? 0,
                'total_controllers' => $extractedData['controllers']['total_controllers'] ?? 0,
                'total_models' => $extractedData['models']['total_models'] ?? 0,
                'total_tables' => count($extractedData['database']['tables'] ?? []),
                'total_middleware' => count($extractedData['middleware']['middleware_files'] ?? [])
            ],
            'complexity_analysis' => $this->analyzeComplexity($extractedData),
            'migration_readiness' => $this->assessMigrationReadiness($extractedData),
            'critical_dependencies' => $this->identifyCriticalDependencies($extractedData),
            'data_relationships' => $this->analyzeDataRelationships($extractedData),
            'security_analysis' => $this->analyzeSecurityFeatures($extractedData),
            'recommendations' => $this->generateMigrationRecommendations($extractedData)
        ];
        
        return $summary;
    }
    
    /**
     * Analisa complexidade do projeto
     */
    private function analyzeComplexity(array $data): array 
    {
        $complexity = [
            'overall_score' => 0,
            'route_complexity' => 'low',
            'controller_complexity' => 'low',
            'model_complexity' => 'low',
            'database_complexity' => 'low',
            'factors' => []
        ];
        
        // Análise de rotas
        $totalRoutes = $data['routes']['total_routes'] ?? 0;
        if ($totalRoutes > 100) {
            $complexity['route_complexity'] = 'high';
            $complexity['factors'][] = "High number of routes ({$totalRoutes})";
        } elseif ($totalRoutes > 50) {
            $complexity['route_complexity'] = 'medium';
        }
        
        // Análise de models
        $totalModels = $data['models']['total_models'] ?? 0;
        $totalRelationships = $data['models']['statistics']['total_relationships'] ?? 0;
        
        if ($totalModels > 20 || $totalRelationships > 50) {
            $complexity['model_complexity'] = 'high';
            $complexity['factors'][] = "Complex data model ({$totalModels} models, {$totalRelationships} relationships)";
        } elseif ($totalModels > 10 || $totalRelationships > 20) {
            $complexity['model_complexity'] = 'medium';
        }
        
        // Score geral
        $scores = [
            'low' => 1,
            'medium' => 2,
            'high' => 3
        ];
        
        $avgScore = (
            $scores[$complexity['route_complexity']] +
            $scores[$complexity['controller_complexity']] +
            $scores[$complexity['model_complexity']] +
            $scores[$complexity['database_complexity']]
        ) / 4;
        
        $complexity['overall_score'] = round($avgScore, 2);
        
        return $complexity;
    }
    
    /**
     * Avalia prontidão para migração
     */
    private function assessMigrationReadiness(array $data): array 
    {
        $readiness = [
            'overall_score' => 0,
            'ready_components' => [],
            'challenging_components' => [],
            'blockers' => [],
            'recommendations' => []
        ];
        
        // Verificar componentes prontos
        if (isset($data['routes']['statistics']['authenticated_routes'])) {
            $readiness['ready_components'][] = 'Authentication system identified';
        }
        
        if (isset($data['models']['statistics']['features_usage']['uses_soft_deletes'])) {
            $readiness['ready_components'][] = 'Soft deletes pattern identified';
        }
        
        // Identificar desafios
        $externalApis = 0;
        if (isset($data['controllers']['dependency_analysis'])) {
            foreach ($data['controllers']['controllers'] as $controller) {
                foreach ($controller['methods'] as $method) {
                    if (!empty($method['body_analysis']['external_api_calls'])) {
                        $externalApis++;
                    }
                }
            }
        }
        
        if ($externalApis > 0) {
            $readiness['challenging_components'][] = "External API integrations ({$externalApis} found)";
        }
        
        // Score de prontidão
        $readyCount = count($readiness['ready_components']);
        $challengeCount = count($readiness['challenging_components']);
        $blockerCount = count($readiness['blockers']);
        
        $readiness['overall_score'] = max(0, min(100, 
            ($readyCount * 20) - ($challengeCount * 10) - ($blockerCount * 30)
        ));
        
        return $readiness;
    }
    
    /**
     * Identifica dependências críticas
     */
    private function identifyCriticalDependencies(array $data): array 
    {
        $dependencies = [
            'external_apis' => [],
            'laravel_features' => [],
            'third_party_packages' => []
        ];
        
        // APIs externas identificadas
        if (isset($data['controllers'])) {
            foreach ($data['controllers']['controllers'] as $controller) {
                foreach ($controller['methods'] as $method) {
                    if (!empty($method['body_analysis']['external_api_calls'])) {
                        $dependencies['external_apis'] = array_merge(
                            $dependencies['external_apis'],
                            $method['body_analysis']['external_api_calls']
                        );
                    }
                }
            }
        }
        
        $dependencies['external_apis'] = array_unique($dependencies['external_apis']);
        
        return $dependencies;
    }
    
    /**
     * Analisa relacionamentos de dados
     */
    private function analyzeDataRelationships(array $data): array 
    {
        return $data['models']['relationship_map'] ?? [];
    }
    
    /**
     * Analisa características de segurança
     */
    private function analyzeSecurityFeatures(array $data): array 
    {
        $security = [
            'authentication_middleware' => [],
            'authorization_patterns' => [],
            'csrf_protection' => false,
            'rate_limiting' => false
        ];
        
        // Analisar middleware de autenticação
        if (isset($data['middleware']['kernel_middleware'])) {
            foreach ($data['middleware']['kernel_middleware']['route'] as $name => $class) {
                if (strpos($name, 'auth') !== false) {
                    $security['authentication_middleware'][] = $name;
                }
                if (strpos($name, 'throttle') !== false) {
                    $security['rate_limiting'] = true;
                }
            }
        }
        
        return $security;
    }
    
    /**
     * Gera recomendações para migração
     */
    private function generateMigrationRecommendations(array $data): array 
    {
        $recommendations = [
            'high_priority' => [],
            'medium_priority' => [],
            'low_priority' => []
        ];
        
        // Recomendações baseadas na análise
        $totalRoutes = $data['routes']['total_routes'] ?? 0;
        
        if ($totalRoutes > 50) {
            $recommendations['high_priority'][] = 'Consider modular approach for large number of routes';
        }
        
        $recommendations['high_priority'][] = 'Start with authentication system migration';
        $recommendations['medium_priority'][] = 'Migrate core business models first';
        $recommendations['low_priority'][] = 'Optimize database queries during migration';
        
        return $recommendations;
    }
    
    /**
     * Salva dados em JSON
     */
    private function saveJson(string $filename, array $data): void 
    {
        $outputFile = $this->outputDir . "/{$filename}.json";
        
        $success = file_put_contents(
            $outputFile,
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
        
        if (!$success) {
            throw new Exception("Falha ao salvar arquivo: {$outputFile}");
        }
    }
    
    /**
     * Exibe estatísticas finais
     */
    private function displayFinalStatistics(array $data): void 
    {
        $executionTime = microtime(true) - $this->extractionStartTime;
        
        echo "═══════════════════════════════════════════════════\n";
        echo "✅ EXTRAÇÃO COMPLETA FINALIZADA COM SUCESSO!\n";
        echo "═══════════════════════════════════════════════════\n\n";
        
        echo "📊 ESTATÍSTICAS FINAIS:\n";
        echo "─────────────────────────\n";
        echo "⏱️  Tempo de execução: " . round($executionTime, 2) . " segundos\n";
        echo "📍 Rotas extraídas: " . ($data['routes']['total_routes'] ?? 0) . "\n";
        echo "🎛️  Controllers analisados: " . ($data['controllers']['total_controllers'] ?? 0) . "\n";
        echo "🗃️  Models analisados: " . ($data['models']['total_models'] ?? 0) . "\n";
        echo "🗄️  Tabelas do banco: " . count($data['database']['tables'] ?? []) . "\n";
        echo "🛡️  Middleware analisados: " . count($data['middleware']['middleware_files'] ?? []) . "\n";
        
        $complexity = $data['summary']['complexity_analysis']['overall_score'] ?? 0;
        $readiness = $data['summary']['migration_readiness']['overall_score'] ?? 0;
        
        echo "\n📈 ANÁLISES:\n";
        echo "─────────────────────────\n";
        echo "🔢 Score de complexidade: {$complexity}/3.0\n";
        echo "🎯 Prontidão para migração: {$readiness}%\n";
        
        echo "\n📁 ARQUIVOS GERADOS:\n";
        echo "─────────────────────────\n";
        echo "📄 docs/extraction/routes-detailed.json\n";
        echo "📄 docs/extraction/controllers-analysis.json\n";
        echo "📄 docs/extraction/models-analysis.json\n";
        echo "📄 docs/extraction/database-schema.json\n";
        echo "📄 docs/extraction/middleware-analysis.json\n";
        echo "📄 docs/extraction/extraction-summary.json\n";
        
        echo "\n🎯 PRÓXIMOS PASSOS:\n";
        echo "─────────────────────────\n";
        echo "1️⃣  Revisar arquivos JSON gerados\n";
        echo "2️⃣  Executar especificações de migração\n";
        echo "3️⃣  Iniciar migração modular para NestJS\n";
        echo "4️⃣  Validar compatibilidade de endpoints\n\n";
    }
    
    // Métodos auxiliares para extração de middleware do kernel
    private function extractMiddlewareFromKernel(string $content, string $property): array 
    {
        $pattern = "/protected\\s+\\\${$property}\\s*=\\s*\\[(.*?)\\];/s";
        
        if (preg_match($pattern, $content, $matches)) {
            return $this->parseMiddlewareArray($matches[1]);
        }
        
        return [];
    }
    
    private function extractMiddlewareFromRoutes(string $content): array 
    {
        $middleware = [];
        
        // Procurar por ->middleware() calls
        preg_match_all('/->middleware\\([\'"]([^\'"]+)[\'"]\\)/', $content, $matches);
        
        foreach ($matches[1] as $mid) {
            $middleware[] = $mid;
        }
        
        return array_unique($middleware);
    }
    
    private function parseMiddlewareArray(string $arrayContent): array 
    {
        $result = [];
        
        // Parse simple array items
        preg_match_all("/['\"]([^'\"]+)['\"]/", $arrayContent, $matches);
        
        foreach ($matches[1] as $item) {
            $result[] = $item;
        }
        
        return $result;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXECUÇÃO DO SCRIPT MASTER
// ═══════════════════════════════════════════════════════════════

if (php_sapi_name() === 'cli') {
    echo "\n";
    echo "██╗      █████╗ ██████╗  █████╗ ██╗   ██╗███████╗██╗     \n";
    echo "██║     ██╔══██╗██╔══██╗██╔══██╗██║   ██║██╔════╝██║     \n";
    echo "██║     ███████║██████╔╝███████║██║   ██║█████╗  ██║     \n";
    echo "██║     ██╔══██║██╔══██╗██╔══██║╚██╗ ██╔╝██╔══╝  ██║     \n";
    echo "███████╗██║  ██║██║  ██║██║  ██║ ╚████╔╝ ███████╗███████╗\n";
    echo "╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚══════╝\n";
    echo "                                                         \n";
    echo "MASTER EXTRACTION TOOL → NESTJS MIGRATION               \n\n";
}

try {
    $masterExtractor = new MasterExtractor();
    $extractionData = $masterExtractor->extractAll();
    
    exit(0);
    
} catch (Exception $e) {
    echo "\n❌ FALHA CRÍTICA NA EXTRAÇÃO\n";
    echo "═══════════════════════════════════════════════════\n";
    echo "Erro: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . "\n";
    echo "Linha: " . $e->getLine() . "\n\n";
    echo "💡 Verifique:\n";
    echo "- Conexão com banco de dados\n";
    echo "- Permissões de escrita em docs/extraction/\n";
    echo "- Sintaxe dos arquivos Laravel\n\n";
    
    exit(1);
}