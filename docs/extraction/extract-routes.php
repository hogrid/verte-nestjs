<?php
/**
 * Script de Extração Detalhada de Rotas Laravel
 * 
 * Extrai informações completas sobre todas as rotas do projeto
 * incluindo controllers, middleware, parâmetros e validações.
 */

// Verificar se está sendo executado no contexto correto
if (!file_exists('vendor/autoload.php')) {
    die("❌ Erro: Execute este script na raiz do projeto Laravel\n");
}

require_once 'vendor/autoload.php';

// Bootstrap da aplicação Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

use Illuminate\Support\Facades\Route;
use ReflectionClass;
use ReflectionMethod;
use ReflectionException;

class RouteExtractor 
{
    private $extractionData = [];
    
    /**
     * Extrai informações detalhadas de todas as rotas
     */
    public function extractDetailedRoutes(): array 
    {
        echo "🔍 Iniciando extração de rotas...\n";
        
        $routes = Route::getRoutes();
        $extracted = [];
        $routeCount = 0;
        
        foreach ($routes as $route) {
            $routeInfo = [
                'id' => $routeCount++,
                'methods' => $route->methods(),
                'uri' => $route->uri(),
                'name' => $route->getName(),
                'domain' => $route->getDomain(),
                'controller' => $this->getControllerInfo($route),
                'middleware' => $this->getMiddleware($route),
                'parameters' => $this->getParameters($route),
                'where_constraints' => $route->wheres,
                'action' => $route->getActionName(),
                'compiled_pattern' => $route->getCompiled()->getPattern(),
                'requirements' => $route->getCompiled()->getRequirements(),
                'defaults' => $route->getDefaults(),
                'validation_analysis' => $this->analyzeValidation($route),
                'response_analysis' => $this->analyzeResponse($route)
            ];
            
            $extracted[] = $routeInfo;
        }
        
        // Análise estatística
        $this->extractionData = [
            'total_routes' => count($extracted),
            'extraction_timestamp' => date('Y-m-d H:i:s'),
            'routes' => $extracted,
            'statistics' => $this->generateStatistics($extracted),
            'grouped_by_controller' => $this->groupByController($extracted),
            'grouped_by_middleware' => $this->groupByMiddleware($extracted),
            'grouped_by_method' => $this->groupByMethod($extracted)
        ];
        
        echo "✅ Extraídas {$this->extractionData['total_routes']} rotas\n";
        
        return $this->extractionData;
    }
    
    /**
     * Extrai informações do controller
     */
    private function getControllerInfo($route): ?array 
    {
        $action = $route->getAction();
        
        if (!isset($action['controller'])) {
            return null;
        }
        
        $controller = $action['controller'];
        
        if (is_string($controller) && strpos($controller, '@') !== false) {
            [$class, $method] = explode('@', $controller);
            
            $controllerInfo = [
                'class' => $class,
                'method' => $method,
                'file' => $this->getControllerFile($class),
                'namespace' => $this->getControllerNamespace($class),
                'method_analysis' => $this->analyzeControllerMethod($class, $method)
            ];
            
            return $controllerInfo;
        }
        
        if (is_callable($controller)) {
            return [
                'type' => 'closure',
                'callable' => true,
                'file' => 'routes file',
                'namespace' => null,
                'method_analysis' => null
            ];
        }
        
        return null;
    }
    
    /**
     * Obtém o arquivo do controller
     */
    private function getControllerFile(string $controllerClass): ?string 
    {
        try {
            $reflection = new ReflectionClass($controllerClass);
            return str_replace(base_path() . '/', '', $reflection->getFileName());
        } catch (ReflectionException $e) {
            return null;
        }
    }
    
    /**
     * Obtém o namespace do controller
     */
    private function getControllerNamespace(string $controllerClass): ?string 
    {
        try {
            $reflection = new ReflectionClass($controllerClass);
            return $reflection->getNamespaceName();
        } catch (ReflectionException $e) {
            return null;
        }
    }
    
    /**
     * Analisa o método do controller
     */
    private function analyzeControllerMethod(string $controllerClass, string $methodName): ?array 
    {
        try {
            $reflection = new ReflectionClass($controllerClass);
            
            if (!$reflection->hasMethod($methodName)) {
                return null;
            }
            
            $method = $reflection->getMethod($methodName);
            
            $analysis = [
                'visibility' => $this->getMethodVisibility($method),
                'parameters' => $this->getMethodParameters($method),
                'return_type' => $method->getReturnType() ? $method->getReturnType()->getName() : null,
                'docblock' => $method->getDocComment() ?: null,
                'is_static' => $method->isStatic(),
                'line_start' => $method->getStartLine(),
                'line_end' => $method->getEndLine()
            ];
            
            return $analysis;
            
        } catch (ReflectionException $e) {
            return null;
        }
    }
    
    /**
     * Obtém visibilidade do método
     */
    private function getMethodVisibility(ReflectionMethod $method): string 
    {
        if ($method->isPublic()) return 'public';
        if ($method->isProtected()) return 'protected';
        if ($method->isPrivate()) return 'private';
        return 'unknown';
    }
    
    /**
     * Obtém parâmetros do método
     */
    private function getMethodParameters(ReflectionMethod $method): array 
    {
        $parameters = [];
        
        foreach ($method->getParameters() as $param) {
            $paramInfo = [
                'name' => $param->getName(),
                'type' => $param->getType() ? $param->getType()->getName() : null,
                'optional' => $param->isOptional(),
                'default' => null
            ];
            
            if ($param->isDefaultValueAvailable()) {
                try {
                    $paramInfo['default'] = $param->getDefaultValue();
                } catch (Exception $e) {
                    $paramInfo['default'] = 'unknown';
                }
            }
            
            $parameters[] = $paramInfo;
        }
        
        return $parameters;
    }
    
    /**
     * Extrai middleware da rota
     */
    private function getMiddleware($route): array 
    {
        $middleware = [];
        
        foreach ($route->gatherMiddleware() as $mid) {
            if (is_string($mid)) {
                $middleware[] = [
                    'name' => $mid,
                    'parameters' => []
                ];
            } elseif (is_array($mid) && !empty($mid)) {
                $middleware[] = [
                    'name' => $mid[0],
                    'parameters' => array_slice($mid, 1)
                ];
            }
        }
        
        return $middleware;
    }
    
    /**
     * Extrai parâmetros da rota
     */
    private function getParameters($route): array 
    {
        $parameters = [];
        
        // Extrair nomes dos parâmetros da URI
        preg_match_all('/\{([^}]+)\}/', $route->uri(), $matches);
        
        foreach ($matches[1] as $param) {
            $optional = strpos($param, '?') !== false;
            $paramName = str_replace('?', '', $param);
            
            $parameters[] = [
                'name' => $paramName,
                'optional' => $optional,
                'regex' => $route->wheres[$paramName] ?? null,
                'type' => $this->inferParameterType($paramName, $route->wheres[$paramName] ?? null)
            ];
        }
        
        return $parameters;
    }
    
    /**
     * Infere o tipo do parâmetro baseado no nome e regex
     */
    private function inferParameterType(string $paramName, ?string $regex): string 
    {
        if ($regex) {
            if (strpos($regex, '\d') !== false || $regex === '[0-9]+') {
                return 'integer';
            }
            if (strpos($regex, 'uuid') !== false) {
                return 'uuid';
            }
        }
        
        // Inferir por nome
        if (in_array($paramName, ['id', 'user_id', 'campaign_id', 'contact_id'])) {
            return 'integer';
        }
        
        if (strpos($paramName, '_id') !== false) {
            return 'integer';
        }
        
        return 'string';
    }
    
    /**
     * Analisa validações da rota
     */
    private function analyzeValidation($route): array 
    {
        $analysis = [
            'has_form_request' => false,
            'form_request_class' => null,
            'estimated_validation_rules' => []
        ];
        
        $controllerInfo = $this->getControllerInfo($route);
        
        if ($controllerInfo && $controllerInfo['method_analysis']) {
            $parameters = $controllerInfo['method_analysis']['parameters'];
            
            foreach ($parameters as $param) {
                if ($param['type'] && strpos($param['type'], 'Request') !== false) {
                    $analysis['has_form_request'] = true;
                    $analysis['form_request_class'] = $param['type'];
                    break;
                }
            }
        }
        
        return $analysis;
    }
    
    /**
     * Analisa tipo de resposta da rota
     */
    private function analyzeResponse($route): array 
    {
        $analysis = [
            'expected_format' => 'json',
            'resource_class' => null,
            'status_codes' => [200] // Default
        ];
        
        // Inferir baseado no método HTTP
        $methods = $route->methods();
        
        if (in_array('POST', $methods)) {
            $analysis['status_codes'] = [201, 422];
        } elseif (in_array('DELETE', $methods)) {
            $analysis['status_codes'] = [204, 404];
        } elseif (in_array('PUT', $methods) || in_array('PATCH', $methods)) {
            $analysis['status_codes'] = [200, 422, 404];
        }
        
        return $analysis;
    }
    
    /**
     * Gera estatísticas das rotas
     */
    private function generateStatistics(array $routes): array 
    {
        $stats = [
            'by_method' => [],
            'by_controller' => [],
            'by_middleware' => [],
            'authenticated_routes' => 0,
            'public_routes' => 0,
            'with_parameters' => 0,
            'with_validation' => 0
        ];
        
        foreach ($routes as $route) {
            // Por método HTTP
            foreach ($route['methods'] as $method) {
                $stats['by_method'][$method] = ($stats['by_method'][$method] ?? 0) + 1;
            }
            
            // Por controller
            if ($route['controller']) {
                $controller = $route['controller']['class'] ?? 'Closure';
                $stats['by_controller'][$controller] = ($stats['by_controller'][$controller] ?? 0) + 1;
            }
            
            // Por middleware
            $hasAuth = false;
            foreach ($route['middleware'] as $middleware) {
                $name = $middleware['name'];
                $stats['by_middleware'][$name] = ($stats['by_middleware'][$name] ?? 0) + 1;
                
                if (in_array($name, ['auth', 'auth:sanctum', 'CheckAuthCookie'])) {
                    $hasAuth = true;
                }
            }
            
            if ($hasAuth) {
                $stats['authenticated_routes']++;
            } else {
                $stats['public_routes']++;
            }
            
            // Com parâmetros
            if (!empty($route['parameters'])) {
                $stats['with_parameters']++;
            }
            
            // Com validação
            if ($route['validation_analysis']['has_form_request']) {
                $stats['with_validation']++;
            }
        }
        
        return $stats;
    }
    
    /**
     * Agrupa rotas por controller
     */
    private function groupByController(array $routes): array 
    {
        $grouped = [];
        
        foreach ($routes as $route) {
            $controller = $route['controller']['class'] ?? 'Closure';
            $grouped[$controller][] = $route;
        }
        
        return $grouped;
    }
    
    /**
     * Agrupa rotas por middleware
     */
    private function groupByMiddleware(array $routes): array 
    {
        $grouped = [];
        
        foreach ($routes as $route) {
            foreach ($route['middleware'] as $middleware) {
                $name = $middleware['name'];
                $grouped[$name][] = $route;
            }
        }
        
        return $grouped;
    }
    
    /**
     * Agrupa rotas por método HTTP
     */
    private function groupByMethod(array $routes): array 
    {
        $grouped = [];
        
        foreach ($routes as $route) {
            foreach ($route['methods'] as $method) {
                $grouped[$method][] = $route;
            }
        }
        
        return $grouped;
    }
}

// Execução do script
echo "🚀 Iniciando extração detalhada de rotas Laravel\n";
echo "📍 Diretório: " . base_path() . "\n\n";

try {
    $extractor = new RouteExtractor();
    $extractedData = $extractor->extractDetailedRoutes();
    
    // Salvar dados extraídos
    $outputFile = base_path('docs/extraction/routes-detailed.json');
    file_put_contents(
        $outputFile,
        json_encode($extractedData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
    
    echo "\n✅ Extração concluída com sucesso!\n";
    echo "📁 Arquivo gerado: docs/extraction/routes-detailed.json\n";
    echo "📊 Total de rotas: " . $extractedData['total_routes'] . "\n";
    echo "🔒 Rotas autenticadas: " . $extractedData['statistics']['authenticated_routes'] . "\n";
    echo "🌐 Rotas públicas: " . $extractedData['statistics']['public_routes'] . "\n";
    echo "📝 Com validação: " . $extractedData['statistics']['with_validation'] . "\n";
    
} catch (Exception $e) {
    echo "❌ Erro durante extração: " . $e->getMessage() . "\n";
    echo "📍 Arquivo: " . $e->getFile() . "\n";
    echo "📍 Linha: " . $e->getLine() . "\n";
    exit(1);
}

echo "\n🎯 Próximo passo: Execute extract-controllers.php\n";