<?php
/**
 * Script de Análise Detalhada de Controllers Laravel
 * 
 * Analisa todos os controllers do projeto extraindo:
 * - Estrutura de classes e métodos
 * - Dependências e injeções
 * - Validações e regras de negócio
 * - Middleware aplicados
 * - Operações de banco e APIs externas
 */

// Verificar se está sendo executado no contexto correto
if (!file_exists('vendor/autoload.php')) {
    die("❌ Erro: Execute este script na raiz do projeto Laravel\n");
}

require_once 'vendor/autoload.php';

use ReflectionClass;
use ReflectionMethod;
use ReflectionParameter;
use ReflectionException;

class ControllerExtractor 
{
    private $basePath;
    private $analysisData = [];
    
    public function __construct(string $basePath = 'app/Http/Controllers') 
    {
        $this->basePath = $basePath;
    }
    
    /**
     * Extrai e analisa todos os controllers
     */
    public function extractAllControllers(): array 
    {
        echo "🎛️ Iniciando análise de controllers...\n";
        
        $controllers = [];
        $files = $this->getPhpFiles($this->basePath);
        
        echo "📁 Encontrados " . count($files) . " arquivos de controller\n";
        
        foreach ($files as $file) {
            echo "🔍 Analisando: " . basename($file) . "\n";
            
            $controller = $this->analyzeController($file);
            if ($controller) {
                $controllers[] = $controller;
            }
        }
        
        $this->analysisData = [
            'total_controllers' => count($controllers),
            'analysis_timestamp' => date('Y-m-d H:i:s'),
            'controllers' => $controllers,
            'statistics' => $this->generateStatistics($controllers),
            'dependency_analysis' => $this->analyzeDependencies($controllers),
            'complexity_metrics' => $this->calculateComplexity($controllers)
        ];
        
        echo "✅ Analisados " . count($controllers) . " controllers\n";
        
        return $this->analysisData;
    }
    
    /**
     * Obtém todos os arquivos PHP de uma pasta
     */
    private function getPhpFiles(string $path): array 
    {
        $files = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $files[] = $file->getPathname();
            }
        }
        
        return $files;
    }
    
    /**
     * Analisa um controller específico
     */
    private function analyzeController(string $filePath): ?array 
    {
        try {
            $content = file_get_contents($filePath);
            
            $result = [
                'file' => str_replace(base_path() . '/', '', $filePath),
                'full_path' => $filePath,
                'namespace' => $this->extractNamespace($content),
                'class_name' => $this->extractClassName($content),
                'extends' => $this->extractParentClass($content),
                'implements' => $this->extractInterfaces($content),
                'traits' => $this->extractTraits($content),
                'properties' => $this->extractProperties($content),
                'methods' => $this->extractMethods($content),
                'dependencies' => $this->extractDependencies($content),
                'middleware' => $this->extractControllerMiddleware($content),
                'imports' => $this->extractImports($content),
                'file_metrics' => $this->calculateFileMetrics($content),
                'business_logic_analysis' => $this->analyzeBusinessLogic($content)
            ];
            
            return $result;
            
        } catch (Exception $e) {
            echo "⚠️ Erro ao analisar {$filePath}: " . $e->getMessage() . "\n";
            return null;
        }
    }
    
    /**
     * Extrai namespace da classe
     */
    private function extractNamespace(string $content): ?string 
    {
        if (preg_match('/namespace\s+([^;]+);/', $content, $matches)) {
            return trim($matches[1]);
        }
        return null;
    }
    
    /**
     * Extrai nome da classe
     */
    private function extractClassName(string $content): ?string 
    {
        if (preg_match('/class\s+(\w+)/', $content, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    /**
     * Extrai classe pai
     */
    private function extractParentClass(string $content): ?string 
    {
        if (preg_match('/class\s+\w+\s+extends\s+(\w+)/', $content, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    /**
     * Extrai interfaces implementadas
     */
    private function extractInterfaces(string $content): array 
    {
        $interfaces = [];
        if (preg_match('/implements\s+([^{]+)/', $content, $matches)) {
            $interfaceList = explode(',', $matches[1]);
            foreach ($interfaceList as $interface) {
                $interfaces[] = trim($interface);
            }
        }
        return $interfaces;
    }
    
    /**
     * Extrai traits utilizados
     */
    private function extractTraits(string $content): array 
    {
        $traits = [];
        preg_match_all('/use\s+([^;]+);/m', $content, $matches);
        
        foreach ($matches[1] as $use) {
            // Filtrar apenas traits (normalmente começam com maiúscula e não têm namespace)
            if (preg_match('/^[A-Z]\w*$/', trim($use))) {
                $traits[] = trim($use);
            }
        }
        
        return $traits;
    }
    
    /**
     * Extrai propriedades da classe
     */
    private function extractProperties(string $content): array 
    {
        $properties = [];
        
        // Propriedades públicas, privadas e protegidas
        preg_match_all('/(?:public|private|protected)\s+(?:static\s+)?\$(\w+)(?:\s*=\s*([^;]+))?;/', $content, $matches, PREG_SET_ORDER);
        
        foreach ($matches as $match) {
            $properties[] = [
                'name' => $match[1],
                'default_value' => isset($match[2]) ? trim($match[2]) : null,
                'visibility' => $this->extractPropertyVisibility($content, $match[1]),
                'is_static' => strpos($match[0], 'static') !== false
            ];
        }
        
        return $properties;
    }
    
    /**
     * Extrai visibilidade de uma propriedade
     */
    private function extractPropertyVisibility(string $content, string $propertyName): string 
    {
        if (preg_match('/public\s+(?:static\s+)?\$' . $propertyName . '/', $content)) {
            return 'public';
        }
        if (preg_match('/private\s+(?:static\s+)?\$' . $propertyName . '/', $content)) {
            return 'private';
        }
        if (preg_match('/protected\s+(?:static\s+)?\$' . $propertyName . '/', $content)) {
            return 'protected';
        }
        return 'unknown';
    }
    
    /**
     * Extrai métodos da classe
     */
    private function extractMethods(string $content): array 
    {
        $methods = [];
        
        // Pattern para capturar métodos com diferentes visibilidades
        preg_match_all('/(?:public|private|protected)\s+(?:static\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/', $content, $matches, PREG_SET_ORDER);
        
        foreach ($matches as $match) {
            $methodName = $match[1];
            $parameters = $this->parseMethodParameters($match[2]);
            $returnType = isset($match[3]) ? trim($match[3]) : null;
            
            $methods[] = [
                'name' => $methodName,
                'visibility' => $this->extractMethodVisibility($content, $methodName),
                'is_static' => $this->isMethodStatic($content, $methodName),
                'parameters' => $parameters,
                'return_type' => $returnType,
                'docblock' => $this->extractMethodDocblock($content, $methodName),
                'body_analysis' => $this->analyzeMethodBody($content, $methodName),
                'line_count' => $this->getMethodLineCount($content, $methodName),
                'complexity_score' => $this->calculateMethodComplexity($content, $methodName)
            ];
        }
        
        return $methods;
    }
    
    /**
     * Extrai visibilidade do método
     */
    private function extractMethodVisibility(string $content, string $methodName): string 
    {
        if (preg_match('/public\s+(?:static\s+)?function\s+' . $methodName . '/', $content)) {
            return 'public';
        }
        if (preg_match('/private\s+(?:static\s+)?function\s+' . $methodName . '/', $content)) {
            return 'private';
        }
        if (preg_match('/protected\s+(?:static\s+)?function\s+' . $methodName . '/', $content)) {
            return 'protected';
        }
        return 'unknown';
    }
    
    /**
     * Verifica se método é estático
     */
    private function isMethodStatic(string $content, string $methodName): bool 
    {
        return preg_match('/(?:public|private|protected)\s+static\s+function\s+' . $methodName . '/', $content) ? true : false;
    }
    
    /**
     * Parse dos parâmetros do método
     */
    private function parseMethodParameters(string $parametersString): array 
    {
        $parameters = [];
        
        if (empty(trim($parametersString))) {
            return $parameters;
        }
        
        // Dividir parâmetros por vírgula (simplificado)
        $paramList = explode(',', $parametersString);
        
        foreach ($paramList as $param) {
            $param = trim($param);
            
            // Pattern para capturar tipo, nome e valor padrão
            if (preg_match('/(?:([^\s]+)\s+)?\$(\w+)(?:\s*=\s*(.+))?/', $param, $matches)) {
                $parameters[] = [
                    'type' => isset($matches[1]) ? trim($matches[1]) : null,
                    'name' => $matches[2],
                    'default_value' => isset($matches[3]) ? trim($matches[3]) : null,
                    'is_optional' => isset($matches[3])
                ];
            }
        }
        
        return $parameters;
    }
    
    /**
     * Extrai docblock do método
     */
    private function extractMethodDocblock(string $content, string $methodName): ?string 
    {
        // Pattern para capturar docblock antes do método
        $pattern = '/\/\*\*.*?\*\/\s*(?:public|private|protected)\s+(?:static\s+)?function\s+' . $methodName . '/s';
        
        if (preg_match($pattern, $content, $matches)) {
            return trim($matches[0]);
        }
        
        return null;
    }
    
    /**
     * Analisa o corpo do método
     */
    private function analyzeMethodBody(string $content, string $methodName): array 
    {
        $methodBody = $this->extractMethodBody($content, $methodName);
        
        if (!$methodBody) {
            return [];
        }
        
        return [
            'uses_request_validation' => $this->checkRequestValidation($methodBody),
            'database_operations' => $this->checkDatabaseOperations($methodBody),
            'external_api_calls' => $this->checkExternalApiCalls($methodBody),
            'event_dispatching' => $this->checkEventDispatching($methodBody),
            'job_dispatching' => $this->checkJobDispatching($methodBody),
            'cache_operations' => $this->checkCacheOperations($methodBody),
            'file_operations' => $this->checkFileOperations($methodBody),
            'validation_rules' => $this->extractValidationRules($methodBody),
            'response_types' => $this->analyzeResponseTypes($methodBody),
            'conditional_complexity' => $this->analyzeConditionalComplexity($methodBody),
            'loop_complexity' => $this->analyzeLoopComplexity($methodBody)
        ];
    }
    
    /**
     * Extrai o corpo do método
     */
    private function extractMethodBody(string $content, string $methodName): ?string 
    {
        $pattern = "/(?:public|private|protected)\s+(?:static\s+)?function\s+{$methodName}\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{/";
        
        if (!preg_match($pattern, $content, $matches, PREG_OFFSET_CAPTURE)) {
            return null;
        }
        
        $startPos = $matches[0][1] + strlen($matches[0][0]);
        $braceCount = 1;
        $pos = $startPos;
        $endPos = $startPos;
        
        // Encontrar chave de fechamento correspondente
        while ($pos < strlen($content) && $braceCount > 0) {
            if ($content[$pos] === '{') $braceCount++;
            if ($content[$pos] === '}') $braceCount--;
            if ($braceCount === 0) $endPos = $pos;
            $pos++;
        }
        
        return substr($content, $startPos, $endPos - $startPos);
    }
    
    /**
     * Verifica validação de request
     */
    private function checkRequestValidation(string $methodBody): array 
    {
        $validations = [];
        
        // $request->validate()
        if (preg_match('/\$request->validate\(/', $methodBody)) {
            $validations[] = '$request->validate()';
        }
        
        // $this->validate()
        if (preg_match('/\$this->validate\(/', $methodBody)) {
            $validations[] = '$this->validate()';
        }
        
        // FormRequest injection
        if (preg_match('/Request\s+\$\w+/', $methodBody)) {
            $validations[] = 'FormRequest injection';
        }
        
        return $validations;
    }
    
    /**
     * Verifica operações de banco de dados
     */
    private function checkDatabaseOperations(string $methodBody): array 
    {
        $operations = [];
        
        // Eloquent operations
        $patterns = [
            '/(\w+)::(create|find|findOrFail|where|update|delete|save|destroy)/' => 'Eloquent Model Operation',
            '/DB::(select|insert|update|delete|table|raw)/' => 'DB Facade Operation',
            '/->save\(\)/' => 'Model Save',
            '/->delete\(\)/' => 'Model Delete',
            '/->update\(/' => 'Model Update',
            '/->create\(/' => 'Model Create'
        ];
        
        foreach ($patterns as $pattern => $type) {
            if (preg_match_all($pattern, $methodBody, $matches)) {
                foreach ($matches[0] as $match) {
                    $operations[] = [
                        'type' => $type,
                        'operation' => $match
                    ];
                }
            }
        }
        
        return $operations;
    }
    
    /**
     * Verifica chamadas para APIs externas
     */
    private function checkExternalApiCalls(string $methodBody): array 
    {
        $apiCalls = [];
        
        // Guzzle HTTP calls
        if (preg_match_all('/\$client->(?:get|post|put|delete|patch)\(/', $methodBody, $matches)) {
            $apiCalls[] = 'Guzzle HTTP Client';
        }
        
        // cURL operations
        if (preg_match('/curl_exec\(|curl_init\(/', $methodBody)) {
            $apiCalls[] = 'cURL';
        }
        
        // Specific API services
        $apiPatterns = [
            '/waha|WAHA/' => 'WAHA WhatsApp API',
            '/stripe|Stripe/' => 'Stripe Payment API',
            '/mercadopago|MercadoPago/' => 'MercadoPago API',
            '/pusher|Pusher/' => 'Pusher WebSocket API'
        ];
        
        foreach ($apiPatterns as $pattern => $service) {
            if (preg_match($pattern, $methodBody)) {
                $apiCalls[] = $service;
            }
        }
        
        return array_unique($apiCalls);
    }
    
    /**
     * Verifica dispatch de eventos
     */
    private function checkEventDispatching(string $methodBody): array 
    {
        $events = [];
        
        if (preg_match_all('/event\(new\s+(\w+)/', $methodBody, $matches)) {
            foreach ($matches[1] as $eventClass) {
                $events[] = $eventClass;
            }
        }
        
        if (preg_match_all('/Event::dispatch\(/', $methodBody, $matches)) {
            $events[] = 'Event::dispatch()';
        }
        
        return $events;
    }
    
    /**
     * Verifica dispatch de jobs
     */
    private function checkJobDispatching(string $methodBody): array 
    {
        $jobs = [];
        
        if (preg_match_all('/dispatch\(new\s+(\w+)/', $methodBody, $matches)) {
            foreach ($matches[1] as $jobClass) {
                $jobs[] = $jobClass;
            }
        }
        
        if (preg_match('/Queue::push\(/', $methodBody)) {
            $jobs[] = 'Queue::push()';
        }
        
        return $jobs;
    }
    
    /**
     * Verifica operações de cache
     */
    private function checkCacheOperations(string $methodBody): array 
    {
        $cacheOps = [];
        
        $patterns = [
            '/Cache::(?:get|put|forget|remember|rememberForever)/' => 'Cache Facade',
            '/cache\(/' => 'cache() helper',
            '/Redis::/' => 'Redis Facade'
        ];
        
        foreach ($patterns as $pattern => $type) {
            if (preg_match($pattern, $methodBody)) {
                $cacheOps[] = $type;
            }
        }
        
        return $cacheOps;
    }
    
    /**
     * Verifica operações de arquivo
     */
    private function checkFileOperations(string $methodBody): array 
    {
        $fileOps = [];
        
        $patterns = [
            '/Storage::/' => 'Storage Facade',
            '/file_get_contents\(|file_put_contents\(/' => 'Native PHP File Functions',
            '/move_uploaded_file\(/' => 'File Upload',
            '/unlink\(/' => 'File Delete'
        ];
        
        foreach ($patterns as $pattern => $type) {
            if (preg_match($pattern, $methodBody)) {
                $fileOps[] = $type;
            }
        }
        
        return $fileOps;
    }
    
    /**
     * Extrai regras de validação
     */
    private function extractValidationRules(string $methodBody): array 
    {
        $rules = [];
        
        // Pattern para $request->validate([...])
        if (preg_match('/\$request->validate\(\s*\[(.*?)\]/s', $methodBody, $matches)) {
            $rulesText = $matches[1];
            
            // Parse individual rules (simplificado)
            preg_match_all("/['\"]([^'\"]+)['\"]\\s*=>\\s*['\"]([^'\"]+)['\"]/", $rulesText, $ruleMatches, PREG_SET_ORDER);
            
            foreach ($ruleMatches as $rule) {
                $rules[$rule[1]] = $rule[2];
            }
        }
        
        return $rules;
    }
    
    /**
     * Analisa tipos de resposta
     */
    private function analyzeResponseTypes(string $methodBody): array 
    {
        $responseTypes = [];
        
        // JSON responses
        if (preg_match('/response\(\)->json\(|return.*->json\(/', $methodBody)) {
            $responseTypes[] = 'JSON';
        }
        
        // View responses
        if (preg_match('/return view\(|return\s+view\s*\(/', $methodBody)) {
            $responseTypes[] = 'View';
        }
        
        // Redirect responses
        if (preg_match('/return redirect\(|return\s+redirect\s*\(/', $methodBody)) {
            $responseTypes[] = 'Redirect';
        }
        
        // Resource responses
        if (preg_match('/return new\s+\w*Resource\(/', $methodBody)) {
            $responseTypes[] = 'Resource';
        }
        
        return array_unique($responseTypes);
    }
    
    /**
     * Analisa complexidade condicional
     */
    private function analyzeConditionalComplexity(string $methodBody): int 
    {
        $complexity = 0;
        
        // Contar ifs, elseifs, switches, etc.
        $complexity += preg_match_all('/\bif\s*\(/', $methodBody);
        $complexity += preg_match_all('/\belseif\s*\(/', $methodBody);
        $complexity += preg_match_all('/\bswitch\s*\(/', $methodBody);
        $complexity += preg_match_all('/\bcase\s+/', $methodBody);
        $complexity += preg_match_all('/\btry\s*\{/', $methodBody);
        $complexity += preg_match_all('/\bcatch\s*\(/', $methodBody);
        
        return $complexity;
    }
    
    /**
     * Analisa complexidade de loops
     */
    private function analyzeLoopComplexity(string $methodBody): int 
    {
        $complexity = 0;
        
        // Contar loops
        $complexity += preg_match_all('/\bfor\s*\(/', $methodBody);
        $complexity += preg_match_all('/\bforeach\s*\(/', $methodBody);
        $complexity += preg_match_all('/\bwhile\s*\(/', $methodBody);
        $complexity += preg_match_all('/\bdo\s*\{/', $methodBody);
        
        return $complexity;
    }
    
    /**
     * Calcula contagem de linhas do método
     */
    private function getMethodLineCount(string $content, string $methodName): int 
    {
        $methodBody = $this->extractMethodBody($content, $methodName);
        
        if (!$methodBody) {
            return 0;
        }
        
        return count(explode("\n", $methodBody));
    }
    
    /**
     * Calcula complexidade do método
     */
    private function calculateMethodComplexity(string $content, string $methodName): int 
    {
        $methodBody = $this->extractMethodBody($content, $methodName);
        
        if (!$methodBody) {
            return 0;
        }
        
        $analysis = $this->analyzeMethodBody($content, $methodName);
        
        $complexity = 1; // Base complexity
        $complexity += $analysis['conditional_complexity'] ?? 0;
        $complexity += $analysis['loop_complexity'] ?? 0;
        $complexity += count($analysis['database_operations'] ?? []);
        $complexity += count($analysis['external_api_calls'] ?? []);
        
        return $complexity;
    }
    
    /**
     * Extrai dependências (imports)
     */
    private function extractDependencies(string $content): array 
    {
        $dependencies = [];
        
        // Imports/uses
        preg_match_all('/use\s+([^;]+);/', $content, $matches);
        
        foreach ($matches[1] as $import) {
            $import = trim($import);
            
            // Filtrar aliases
            if (strpos($import, ' as ') !== false) {
                [$class, $alias] = explode(' as ', $import);
                $dependencies[] = [
                    'class' => trim($class),
                    'alias' => trim($alias),
                    'type' => $this->classifyDependency(trim($class))
                ];
            } else {
                $dependencies[] = [
                    'class' => $import,
                    'alias' => null,
                    'type' => $this->classifyDependency($import)
                ];
            }
        }
        
        return $dependencies;
    }
    
    /**
     * Classifica tipo de dependência
     */
    private function classifyDependency(string $class): string 
    {
        if (strpos($class, 'Illuminate\\') === 0) {
            return 'Laravel Framework';
        }
        
        if (strpos($class, 'App\\') === 0) {
            return 'Application';
        }
        
        if (strpos($class, 'GuzzleHttp\\') === 0) {
            return 'HTTP Client';
        }
        
        return 'Third Party';
    }
    
    /**
     * Extrai middleware do controller
     */
    private function extractControllerMiddleware(string $content): array 
    {
        $middleware = [];
        
        // Middleware no construtor
        if (preg_match('/\$this->middleware\([\'"]([^\'"]+)[\'"]/', $content, $matches)) {
            $middleware[] = [
                'name' => $matches[1],
                'location' => 'constructor'
            ];
        }
        
        return $middleware;
    }
    
    /**
     * Extrai imports do arquivo
     */
    private function extractImports(string $content): array 
    {
        return $this->extractDependencies($content);
    }
    
    /**
     * Calcula métricas do arquivo
     */
    private function calculateFileMetrics(string $content): array 
    {
        return [
            'total_lines' => count(explode("\n", $content)),
            'code_lines' => $this->countCodeLines($content),
            'comment_lines' => $this->countCommentLines($content),
            'blank_lines' => $this->countBlankLines($content),
            'file_size_bytes' => strlen($content)
        ];
    }
    
    /**
     * Conta linhas de código (sem comentários e vazias)
     */
    private function countCodeLines(string $content): int 
    {
        $lines = explode("\n", $content);
        $codeLines = 0;
        
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (!empty($trimmed) && !$this->isCommentLine($trimmed)) {
                $codeLines++;
            }
        }
        
        return $codeLines;
    }
    
    /**
     * Conta linhas de comentário
     */
    private function countCommentLines(string $content): int 
    {
        $lines = explode("\n", $content);
        $commentLines = 0;
        
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($this->isCommentLine($trimmed)) {
                $commentLines++;
            }
        }
        
        return $commentLines;
    }
    
    /**
     * Conta linhas em branco
     */
    private function countBlankLines(string $content): int 
    {
        $lines = explode("\n", $content);
        $blankLines = 0;
        
        foreach ($lines as $line) {
            if (trim($line) === '') {
                $blankLines++;
            }
        }
        
        return $blankLines;
    }
    
    /**
     * Verifica se linha é comentário
     */
    private function isCommentLine(string $line): bool 
    {
        return preg_match('/^(\/\/|\/\*|\*|\#)/', $line) ? true : false;
    }
    
    /**
     * Analisa lógica de negócio geral
     */
    private function analyzeBusinessLogic(string $content): array 
    {
        $analysis = [
            'has_authentication' => false,
            'has_authorization' => false,
            'has_validation' => false,
            'has_database_operations' => false,
            'has_external_apis' => false,
            'has_file_operations' => false,
            'has_cache_operations' => false,
            'business_complexity' => 'low'
        ];
        
        // Análise geral do arquivo
        if (preg_match('/auth|Auth|authenticate/', $content)) {
            $analysis['has_authentication'] = true;
        }
        
        if (preg_match('/authorize|can\(|cannot\(/', $content)) {
            $analysis['has_authorization'] = true;
        }
        
        if (preg_match('/validate|Validator/', $content)) {
            $analysis['has_validation'] = true;
        }
        
        if (preg_match('/::find|::create|::update|::delete|->save\(/', $content)) {
            $analysis['has_database_operations'] = true;
        }
        
        if (preg_match('/guzzle|curl|http|api/i', $content)) {
            $analysis['has_external_apis'] = true;
        }
        
        if (preg_match('/Storage::|file_|upload/', $content)) {
            $analysis['has_file_operations'] = true;
        }
        
        if (preg_match('/Cache::|cache\(|Redis::/', $content)) {
            $analysis['has_cache_operations'] = true;
        }
        
        // Determinar complexidade de negócio
        $complexityFactors = 0;
        $complexityFactors += $analysis['has_authentication'] ? 1 : 0;
        $complexityFactors += $analysis['has_authorization'] ? 1 : 0;
        $complexityFactors += $analysis['has_validation'] ? 1 : 0;
        $complexityFactors += $analysis['has_database_operations'] ? 1 : 0;
        $complexityFactors += $analysis['has_external_apis'] ? 2 : 0; // APIs externas são mais complexas
        $complexityFactors += $analysis['has_file_operations'] ? 1 : 0;
        $complexityFactors += $analysis['has_cache_operations'] ? 1 : 0;
        
        if ($complexityFactors <= 2) {
            $analysis['business_complexity'] = 'low';
        } elseif ($complexityFactors <= 5) {
            $analysis['business_complexity'] = 'medium';
        } else {
            $analysis['business_complexity'] = 'high';
        }
        
        return $analysis;
    }
    
    /**
     * Gera estatísticas gerais
     */
    private function generateStatistics(array $controllers): array 
    {
        $stats = [
            'total_methods' => 0,
            'total_lines' => 0,
            'complexity_distribution' => ['low' => 0, 'medium' => 0, 'high' => 0],
            'most_complex_controllers' => [],
            'common_dependencies' => [],
            'business_logic_patterns' => []
        ];
        
        foreach ($controllers as $controller) {
            $stats['total_methods'] += count($controller['methods']);
            $stats['total_lines'] += $controller['file_metrics']['total_lines'];
            
            // Distribuição de complexidade
            $complexity = $controller['business_logic_analysis']['business_complexity'];
            $stats['complexity_distribution'][$complexity]++;
        }
        
        return $stats;
    }
    
    /**
     * Analisa dependências entre controllers
     */
    private function analyzeDependencies(array $controllers): array 
    {
        $dependencyMap = [];
        $commonDependencies = [];
        
        foreach ($controllers as $controller) {
            foreach ($controller['dependencies'] as $dependency) {
                $className = $dependency['class'];
                
                if (!isset($commonDependencies[$className])) {
                    $commonDependencies[$className] = 0;
                }
                $commonDependencies[$className]++;
            }
        }
        
        // Ordenar por uso mais comum
        arsort($commonDependencies);
        
        return [
            'common_dependencies' => array_slice($commonDependencies, 0, 10),
            'dependency_graph' => $dependencyMap
        ];
    }
    
    /**
     * Calcula métricas de complexidade
     */
    private function calculateComplexity(array $controllers): array 
    {
        $totalComplexity = 0;
        $methodComplexities = [];
        
        foreach ($controllers as $controller) {
            $controllerComplexity = 0;
            
            foreach ($controller['methods'] as $method) {
                $methodComplexity = $method['complexity_score'];
                $controllerComplexity += $methodComplexity;
                $methodComplexities[] = $methodComplexity;
            }
            
            $totalComplexity += $controllerComplexity;
        }
        
        sort($methodComplexities);
        $count = count($methodComplexities);
        
        return [
            'total_complexity' => $totalComplexity,
            'average_complexity' => $count > 0 ? $totalComplexity / $count : 0,
            'median_complexity' => $count > 0 ? $methodComplexities[intval($count / 2)] : 0,
            'max_complexity' => $count > 0 ? max($methodComplexities) : 0,
            'complexity_distribution' => array_count_values($methodComplexities)
        ];
    }
}

// Execução do script
echo "🚀 Iniciando análise detalhada de controllers Laravel\n";
echo "📍 Diretório: " . base_path('app/Http/Controllers') . "\n\n";

try {
    $extractor = new ControllerExtractor();
    $extractedData = $extractor->extractAllControllers();
    
    // Salvar dados extraídos
    $outputFile = base_path('docs/extraction/controllers-analysis.json');
    file_put_contents(
        $outputFile,
        json_encode($extractedData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
    
    echo "\n✅ Análise concluída com sucesso!\n";
    echo "📁 Arquivo gerado: docs/extraction/controllers-analysis.json\n";
    echo "📊 Total de controllers: " . $extractedData['total_controllers'] . "\n";
    echo "🔧 Total de métodos: " . $extractedData['statistics']['total_methods'] . "\n";
    echo "📄 Total de linhas: " . $extractedData['statistics']['total_lines'] . "\n";
    
    $complexityDist = $extractedData['statistics']['complexity_distribution'];
    echo "📈 Complexidade - Baixa: {$complexityDist['low']}, Média: {$complexityDist['medium']}, Alta: {$complexityDist['high']}\n";
    
} catch (Exception $e) {
    echo "❌ Erro durante análise: " . $e->getMessage() . "\n";
    echo "📍 Arquivo: " . $e->getFile() . "\n";
    echo "📍 Linha: " . $e->getLine() . "\n";
    exit(1);
}

echo "\n🎯 Próximo passo: Execute extract-models.php\n";