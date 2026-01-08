<?php
/**
 * Script de Análise Detalhada de Models Laravel
 * 
 * Analisa todos os models do projeto extraindo:
 * - Estrutura de classes e propriedades
 * - Relacionamentos Eloquent
 * - Fillable, hidden, casts
 * - Scopes, mutators e accessors
 * - Configurações de tabela
 */

// Verificar se está sendo executado no contexto correto
if (!file_exists('vendor/autoload.php')) {
    die("❌ Erro: Execute este script na raiz do projeto Laravel\n");
}

require_once 'vendor/autoload.php';

use ReflectionClass;
use ReflectionMethod;
use ReflectionException;

class ModelExtractor 
{
    private $basePath;
    private $analysisData = [];
    
    public function __construct(string $basePath = 'app/Models') 
    {
        $this->basePath = $basePath;
    }
    
    /**
     * Extrai e analisa todos os models
     */
    public function extractAllModels(): array 
    {
        echo "🗃️ Iniciando análise de models...\n";
        
        $models = [];
        $files = glob($this->basePath . '/*.php');
        
        echo "📁 Encontrados " . count($files) . " arquivos de model\n";
        
        foreach ($files as $file) {
            echo "🔍 Analisando: " . basename($file) . "\n";
            
            $model = $this->analyzeModel($file);
            if ($model) {
                $models[] = $model;
            }
        }
        
        $this->analysisData = [
            'total_models' => count($models),
            'analysis_timestamp' => date('Y-m-d H:i:s'),
            'models' => $models,
            'statistics' => $this->generateStatistics($models),
            'relationship_map' => $this->generateRelationshipMap($models),
            'table_coverage' => $this->analyzeTableCoverage($models)
        ];
        
        echo "✅ Analisados " . count($models) . " models\n";
        
        return $this->analysisData;
    }
    
    /**
     * Analisa um model específico
     */
    private function analyzeModel(string $filePath): ?array 
    {
        try {
            $content = file_get_contents($filePath);
            
            $result = [
                'file' => str_replace(base_path() . '/', '', $filePath),
                'full_path' => $filePath,
                'class_name' => $this->extractClassName($content),
                'namespace' => $this->extractNamespace($content),
                'extends' => $this->extractParentClass($content),
                'implements' => $this->extractInterfaces($content),
                'traits' => $this->extractTraits($content),
                'table_config' => $this->extractTableConfig($content),
                'fillable' => $this->extractFillable($content),
                'guarded' => $this->extractGuarded($content),
                'hidden' => $this->extractHidden($content),
                'visible' => $this->extractVisible($content),
                'casts' => $this->extractCasts($content),
                'dates' => $this->extractDates($content),
                'relationships' => $this->extractRelationships($content),
                'scopes' => $this->extractScopes($content),
                'mutators' => $this->extractMutators($content),
                'accessors' => $this->extractAccessors($content),
                'events' => $this->extractModelEvents($content),
                'constants' => $this->extractConstants($content),
                'properties' => $this->extractProperties($content),
                'methods' => $this->extractMethods($content),
                'eloquent_features' => $this->analyzeEloquentFeatures($content),
                'validation_hints' => $this->extractValidationHints($content)
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
        
        // Capturar use statements dentro da classe
        if (preg_match('/class\s+\w+[^{]*\{(.*?)(?:public|private|protected|\s*\})/s', $content, $matches)) {
            $classContent = $matches[1];
            
            preg_match_all('/use\s+([^;]+);/', $classContent, $useMatches);
            
            foreach ($useMatches[1] as $use) {
                $traits[] = trim($use);
            }
        }
        
        return $traits;
    }
    
    /**
     * Extrai configurações da tabela
     */
    private function extractTableConfig(string $content): array 
    {
        $config = [
            'table' => null,
            'primary_key' => 'id',
            'key_type' => 'int',
            'incrementing' => true,
            'timestamps' => true,
            'date_format' => null,
            'connection' => null,
            'per_page' => 15
        ];
        
        // Table name
        if (preg_match('/protected\s+\$table\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
            $config['table'] = $matches[1];
        }
        
        // Primary key
        if (preg_match('/protected\s+\$primaryKey\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
            $config['primary_key'] = $matches[1];
        }
        
        // Key type
        if (preg_match('/protected\s+\$keyType\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
            $config['key_type'] = $matches[1];
        }
        
        // Incrementing
        if (preg_match('/public\s+\$incrementing\s*=\s*(true|false)/', $content, $matches)) {
            $config['incrementing'] = $matches[1] === 'true';
        }
        
        // Timestamps
        if (preg_match('/public\s+\$timestamps\s*=\s*(true|false)/', $content, $matches)) {
            $config['timestamps'] = $matches[1] === 'true';
        }
        
        // Date format
        if (preg_match('/protected\s+\$dateFormat\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
            $config['date_format'] = $matches[1];
        }
        
        // Connection
        if (preg_match('/protected\s+\$connection\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
            $config['connection'] = $matches[1];
        }
        
        // Per page
        if (preg_match('/protected\s+\$perPage\s*=\s*(\d+)/', $content, $matches)) {
            $config['per_page'] = (int)$matches[1];
        }
        
        return $config;
    }
    
    /**
     * Extrai campos fillable
     */
    private function extractFillable(string $content): array 
    {
        return $this->extractArrayProperty($content, 'fillable');
    }
    
    /**
     * Extrai campos guarded
     */
    private function extractGuarded(string $content): array 
    {
        return $this->extractArrayProperty($content, 'guarded');
    }
    
    /**
     * Extrai campos hidden
     */
    private function extractHidden(string $content): array 
    {
        return $this->extractArrayProperty($content, 'hidden');
    }
    
    /**
     * Extrai campos visible
     */
    private function extractVisible(string $content): array 
    {
        return $this->extractArrayProperty($content, 'visible');
    }
    
    /**
     * Extrai casts
     */
    private function extractCasts(string $content): array 
    {
        return $this->extractAssociativeArrayProperty($content, 'casts');
    }
    
    /**
     * Extrai dates
     */
    private function extractDates(string $content): array 
    {
        return $this->extractArrayProperty($content, 'dates');
    }
    
    /**
     * Método auxiliar para extrair propriedades array
     */
    private function extractArrayProperty(string $content, string $propertyName): array 
    {
        $pattern = "/protected\\s+\\\${$propertyName}\\s*=\\s*\\[(.*?)\\]/s";
        
        if (preg_match($pattern, $content, $matches)) {
            $arrayContent = $matches[1];
            
            // Parse array items
            preg_match_all("/['\"]([^'\"]+)['\"]/", $arrayContent, $itemMatches);
            
            return $itemMatches[1];
        }
        
        return [];
    }
    
    /**
     * Método auxiliar para extrair propriedades array associativo
     */
    private function extractAssociativeArrayProperty(string $content, string $propertyName): array 
    {
        $pattern = "/protected\\s+\\\${$propertyName}\\s*=\\s*\\[(.*?)\\]/s";
        
        if (preg_match($pattern, $content, $matches)) {
            $arrayContent = $matches[1];
            
            $result = [];
            
            // Parse key => value pairs
            preg_match_all("/['\"]([^'\"]+)['\"]\\s*=>\\s*['\"]([^'\"]+)['\"]/", $arrayContent, $pairMatches, PREG_SET_ORDER);
            
            foreach ($pairMatches as $pair) {
                $result[$pair[1]] = $pair[2];
            }
            
            return $result;
        }
        
        return [];
    }
    
    /**
     * Extrai relacionamentos Eloquent
     */
    private function extractRelationships(string $content): array 
    {
        $relationships = [];
        
        // Patterns para diferentes tipos de relacionamento
        $patterns = [
            'hasOne' => '/public\\s+function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->hasOne\\(([^)]+)\\)/',
            'hasMany' => '/public\\s+function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->hasMany\\(([^)]+)\\)/',
            'belongsTo' => '/public\\s+function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->belongsTo\\(([^)]+)\\)/',
            'belongsToMany' => '/public\\s+function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->belongsToMany\\(([^)]+)\\)/',
            'morphTo' => '/public\\s+function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->morphTo\\(([^)]*)\\)/',
            'morphMany' => '/public\\s+function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->morphMany\\(([^)]+)\\)/',
            'morphOne' => '/public\\s+function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->morphOne\\(([^)]+)\\)/',
            'hasManyThrough' => '/public\\s+function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->hasManyThrough\\(([^)]+)\\)/',
            'hasOneThrough' => '/public\\s+function\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->hasOneThrough\\(([^)]+)\\)/'
        ];
        
        foreach ($patterns as $type => $pattern) {
            preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);
            
            foreach ($matches as $match) {
                $relationshipParams = $this->parseRelationshipParameters($match[2]);
                
                $relationships[] = [
                    'method_name' => $match[1],
                    'type' => $type,
                    'related_model' => $relationshipParams['model'] ?? null,
                    'foreign_key' => $relationshipParams['foreign_key'] ?? null,
                    'local_key' => $relationshipParams['local_key'] ?? null,
                    'pivot_table' => $relationshipParams['pivot_table'] ?? null,
                    'parameters' => $relationshipParams,
                    'raw_parameters' => trim($match[2])
                ];
            }
        }
        
        return $relationships;
    }
    
    /**
     * Parse dos parâmetros de relacionamento
     */
    private function parseRelationshipParameters(string $params): array 
    {
        $parsed = [];
        
        // Remover espaços e quebras de linha
        $params = preg_replace('/\s+/', ' ', trim($params));
        
        // Split por vírgulas, mas respeitando parênteses e aspas
        $parameters = $this->smartSplit($params, ',');
        
        foreach ($parameters as $index => $param) {
            $param = trim($param);
            
            // Remover aspas e ::class
            $param = preg_replace('/[\'"]|::class/', '', $param);
            
            switch ($index) {
                case 0:
                    $parsed['model'] = $param;
                    break;
                case 1:
                    $parsed['foreign_key'] = $param;
                    break;
                case 2:
                    $parsed['local_key'] = $param;
                    break;
                case 3:
                    $parsed['pivot_table'] = $param;
                    break;
            }
        }
        
        return $parsed;
    }
    
    /**
     * Split inteligente respeitando parênteses e aspas
     */
    private function smartSplit(string $string, string $delimiter): array 
    {
        $result = [];
        $current = '';
        $depth = 0;
        $inQuotes = false;
        $quoteChar = '';
        
        for ($i = 0; $i < strlen($string); $i++) {
            $char = $string[$i];
            
            if (($char === '"' || $char === "'") && !$inQuotes) {
                $inQuotes = true;
                $quoteChar = $char;
            } elseif ($char === $quoteChar && $inQuotes) {
                $inQuotes = false;
                $quoteChar = '';
            } elseif ($char === '(' && !$inQuotes) {
                $depth++;
            } elseif ($char === ')' && !$inQuotes) {
                $depth--;
            } elseif ($char === $delimiter && $depth === 0 && !$inQuotes) {
                $result[] = trim($current);
                $current = '';
                continue;
            }
            
            $current .= $char;
        }
        
        if (!empty(trim($current))) {
            $result[] = trim($current);
        }
        
        return $result;
    }
    
    /**
     * Extrai scopes
     */
    private function extractScopes(string $content): array 
    {
        $scopes = [];
        
        // Local scopes (scopeXxx methods)
        preg_match_all('/public\\s+function\\s+scope(\\w+)\\s*\\([^)]*\\)/', $content, $matches);
        
        foreach ($matches[1] as $scopeName) {
            $scopes[] = [
                'name' => $scopeName,
                'type' => 'local',
                'method' => 'scope' . $scopeName
            ];
        }
        
        // Global scopes (boot method)
        if (preg_match('/protected\\s+static\\s+function\\s+boot\\s*\\(\\)\\s*\\{(.*?)\\}/s', $content, $bootMatch)) {
            $bootContent = $bootMatch[1];
            
            if (preg_match_all('/static::addGlobalScope\\([^)]+\\)/', $bootContent, $globalMatches)) {
                foreach ($globalMatches[0] as $globalScope) {
                    $scopes[] = [
                        'name' => 'global',
                        'type' => 'global',
                        'definition' => $globalScope
                    ];
                }
            }
        }
        
        return $scopes;
    }
    
    /**
     * Extrai mutators
     */
    private function extractMutators(string $content): array 
    {
        $mutators = [];
        
        // Mutators (setXxxAttribute methods)
        preg_match_all('/public\\s+function\\s+set(\\w+)Attribute\\s*\\([^)]*\\)/', $content, $matches);
        
        foreach ($matches[1] as $attributeName) {
            $mutators[] = [
                'attribute' => strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $attributeName)),
                'method' => 'set' . $attributeName . 'Attribute',
                'camel_case' => lcfirst($attributeName)
            ];
        }
        
        return $mutators;
    }
    
    /**
     * Extrai accessors
     */
    private function extractAccessors(string $content): array 
    {
        $accessors = [];
        
        // Accessors (getXxxAttribute methods)
        preg_match_all('/public\\s+function\\s+get(\\w+)Attribute\\s*\\([^)]*\\)/', $content, $matches);
        
        foreach ($matches[1] as $attributeName) {
            $accessors[] = [
                'attribute' => strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $attributeName)),
                'method' => 'get' . $attributeName . 'Attribute',
                'camel_case' => lcfirst($attributeName)
            ];
        }
        
        return $accessors;
    }
    
    /**
     * Extrai eventos do model
     */
    private function extractModelEvents(string $content): array 
    {
        $events = [];
        
        // Eventos no boot method
        if (preg_match('/protected\\s+static\\s+function\\s+boot\\s*\\(\\)\\s*\\{(.*?)\\}/s', $content, $bootMatch)) {
            $bootContent = $bootMatch[1];
            
            $eventTypes = ['creating', 'created', 'updating', 'updated', 'saving', 'saved', 'deleting', 'deleted', 'restoring', 'restored'];
            
            foreach ($eventTypes as $eventType) {
                if (preg_match("/static::{$eventType}\\(/", $bootContent)) {
                    $events[] = [
                        'type' => $eventType,
                        'location' => 'boot_method'
                    ];
                }
            }
        }
        
        // Eventos via $dispatchesEvents
        if (preg_match('/protected\\s+\\\$dispatchesEvents\\s*=\\s*\\[(.*?)\\]/s', $content, $matches)) {
            $eventsContent = $matches[1];
            
            preg_match_all("/['\"]([^'\"]+)['\"]\\s*=>\\s*['\"]?([^'\"\\s,]+)['\"]?/", $eventsContent, $eventMatches, PREG_SET_ORDER);
            
            foreach ($eventMatches as $event) {
                $events[] = [
                    'type' => $event[1],
                    'event_class' => $event[2],
                    'location' => 'dispatchesEvents_property'
                ];
            }
        }
        
        return $events;
    }
    
    /**
     * Extrai constantes da classe
     */
    private function extractConstants(string $content): array 
    {
        $constants = [];
        
        preg_match_all('/const\\s+(\\w+)\\s*=\\s*([^;]+);/', $content, $matches, PREG_SET_ORDER);
        
        foreach ($matches as $match) {
            $constants[] = [
                'name' => $match[1],
                'value' => trim($match[2], ' \'"'),
                'raw_value' => $match[2]
            ];
        }
        
        return $constants;
    }
    
    /**
     * Extrai propriedades da classe
     */
    private function extractProperties(string $content): array 
    {
        $properties = [];
        
        // Propriedades públicas, privadas e protegidas
        preg_match_all('/(?:public|private|protected)\\s+(?:static\\s+)?\\\$(\\w+)(?:\\s*=\\s*([^;]+))?;/', $content, $matches, PREG_SET_ORDER);
        
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
        if (preg_match("/public\\s+(?:static\\s+)?\\\${$propertyName}/", $content)) {
            return 'public';
        }
        if (preg_match("/private\\s+(?:static\\s+)?\\\${$propertyName}/", $content)) {
            return 'private';
        }
        if (preg_match("/protected\\s+(?:static\\s+)?\\\${$propertyName}/", $content)) {
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
        
        // Pattern para capturar métodos
        preg_match_all('/(?:public|private|protected)\\s+(?:static\\s+)?function\\s+(\\w+)\\s*\\(([^)]*)\\)/', $content, $matches, PREG_SET_ORDER);
        
        foreach ($matches as $match) {
            $methodName = $match[1];
            $parameters = $this->parseMethodParameters($match[2]);
            
            $methods[] = [
                'name' => $methodName,
                'visibility' => $this->extractMethodVisibility($content, $methodName),
                'is_static' => $this->isMethodStatic($content, $methodName),
                'parameters' => $parameters,
                'is_relationship' => $this->isRelationshipMethod($methodName, $content),
                'is_scope' => strpos($methodName, 'scope') === 0,
                'is_mutator' => preg_match('/^set\\w+Attribute$/', $methodName),
                'is_accessor' => preg_match('/^get\\w+Attribute$/', $methodName)
            ];
        }
        
        return $methods;
    }
    
    /**
     * Extrai visibilidade do método
     */
    private function extractMethodVisibility(string $content, string $methodName): string 
    {
        if (preg_match("/public\\s+(?:static\\s+)?function\\s+{$methodName}/", $content)) {
            return 'public';
        }
        if (preg_match("/private\\s+(?:static\\s+)?function\\s+{$methodName}/", $content)) {
            return 'private';
        }
        if (preg_match("/protected\\s+(?:static\\s+)?function\\s+{$methodName}/", $content)) {
            return 'protected';
        }
        return 'unknown';
    }
    
    /**
     * Verifica se método é estático
     */
    private function isMethodStatic(string $content, string $methodName): bool 
    {
        return preg_match("/(?:public|private|protected)\\s+static\\s+function\\s+{$methodName}/", $content) ? true : false;
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
            if (preg_match('/(?:([^\\s]+)\\s+)?\\\$(\\w+)(?:\\s*=\\s*(.+))?/', $param, $matches)) {
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
     * Verifica se método é de relacionamento
     */
    private function isRelationshipMethod(string $methodName, string $content): bool 
    {
        $relationshipPatterns = [
            'hasOne', 'hasMany', 'belongsTo', 'belongsToMany',
            'morphTo', 'morphMany', 'morphOne',
            'hasManyThrough', 'hasOneThrough'
        ];
        
        foreach ($relationshipPatterns as $pattern) {
            if (preg_match("/function\\s+{$methodName}\\s*\\([^)]*\\)\\s*\\{[^}]*return\\s+\\\$this->{$pattern}\\(/", $content)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Analisa características Eloquent
     */
    private function analyzeEloquentFeatures(string $content): array 
    {
        $features = [
            'uses_soft_deletes' => false,
            'uses_timestamps' => true,
            'uses_uuid' => false,
            'uses_global_scopes' => false,
            'uses_local_scopes' => false,
            'has_mutators' => false,
            'has_accessors' => false,
            'has_casts' => false,
            'has_events' => false,
            'has_observers' => false
        ];
        
        // Soft deletes
        if (preg_match('/use\\s+SoftDeletes/', $content)) {
            $features['uses_soft_deletes'] = true;
        }
        
        // Timestamps
        if (preg_match('/public\\s+\\\$timestamps\\s*=\\s*false/', $content)) {
            $features['uses_timestamps'] = false;
        }
        
        // UUID
        if (preg_match('/use\\s+HasUuids|keyType.*uuid/i', $content)) {
            $features['uses_uuid'] = true;
        }
        
        // Scopes
        if (preg_match('/function\\s+scope\\w+/', $content)) {
            $features['uses_local_scopes'] = true;
        }
        
        if (preg_match('/addGlobalScope/', $content)) {
            $features['uses_global_scopes'] = true;
        }
        
        // Mutators/Accessors
        if (preg_match('/function\\s+set\\w+Attribute/', $content)) {
            $features['has_mutators'] = true;
        }
        
        if (preg_match('/function\\s+get\\w+Attribute/', $content)) {
            $features['has_accessors'] = true;
        }
        
        // Casts
        if (preg_match('/protected\\s+\\\$casts/', $content)) {
            $features['has_casts'] = true;
        }
        
        // Events
        if (preg_match('/static::(creating|created|updating|updated)/', $content) || 
            preg_match('/protected\\s+\\\$dispatchesEvents/', $content)) {
            $features['has_events'] = true;
        }
        
        return $features;
    }
    
    /**
     * Extrai dicas de validação dos comentários
     */
    private function extractValidationHints(string $content): array 
    {
        $hints = [];
        
        // Procurar por comentários que mencionem validação
        preg_match_all('/\\/\\*\\*(.*?)\\*\\//s', $content, $docblocks);
        
        foreach ($docblocks[1] as $docblock) {
            if (preg_match('/required|optional|nullable|email|min:|max:|unique/i', $docblock)) {
                $hints[] = trim($docblock);
            }
        }
        
        // Procurar por rules() method se existir
        if (preg_match('/function\\s+rules\\s*\\(\\)\\s*\\{(.*?)\\}/s', $content, $rulesMatch)) {
            $hints[] = 'Has rules() method: ' . trim($rulesMatch[1]);
        }
        
        return $hints;
    }
    
    /**
     * Gera estatísticas dos models
     */
    private function generateStatistics(array $models): array 
    {
        $stats = [
            'total_relationships' => 0,
            'relationship_types' => [],
            'features_usage' => [],
            'complexity_distribution' => [],
            'most_connected_models' => []
        ];
        
        foreach ($models as $model) {
            // Relacionamentos
            $relationshipCount = count($model['relationships']);
            $stats['total_relationships'] += $relationshipCount;
            
            foreach ($model['relationships'] as $relationship) {
                $type = $relationship['type'];
                $stats['relationship_types'][$type] = ($stats['relationship_types'][$type] ?? 0) + 1;
            }
            
            // Features
            foreach ($model['eloquent_features'] as $feature => $used) {
                if ($used) {
                    $stats['features_usage'][$feature] = ($stats['features_usage'][$feature] ?? 0) + 1;
                }
            }
            
            // Complexidade baseada no número de relacionamentos e features
            $complexity = 'low';
            if ($relationshipCount > 3 || count(array_filter($model['eloquent_features'])) > 3) {
                $complexity = 'medium';
            }
            if ($relationshipCount > 6 || count(array_filter($model['eloquent_features'])) > 5) {
                $complexity = 'high';
            }
            
            $stats['complexity_distribution'][$complexity] = ($stats['complexity_distribution'][$complexity] ?? 0) + 1;
            
            // Models mais conectados
            if ($relationshipCount > 0) {
                $stats['most_connected_models'][] = [
                    'model' => $model['class_name'],
                    'relationships' => $relationshipCount
                ];
            }
        }
        
        // Ordenar models mais conectados
        usort($stats['most_connected_models'], function($a, $b) {
            return $b['relationships'] - $a['relationships'];
        });
        
        $stats['most_connected_models'] = array_slice($stats['most_connected_models'], 0, 10);
        
        return $stats;
    }
    
    /**
     * Gera mapa de relacionamentos
     */
    private function generateRelationshipMap(array $models): array 
    {
        $map = [];
        
        foreach ($models as $model) {
            $modelName = $model['class_name'];
            $map[$modelName] = [];
            
            foreach ($model['relationships'] as $relationship) {
                $relatedModel = $relationship['related_model'];
                $relationType = $relationship['type'];
                
                $map[$modelName][] = [
                    'target' => $relatedModel,
                    'type' => $relationType,
                    'method' => $relationship['method_name']
                ];
            }
        }
        
        return $map;
    }
    
    /**
     * Analisa cobertura de tabelas
     */
    private function analyzeTableCoverage(array $models): array 
    {
        $coverage = [
            'models_with_explicit_table' => 0,
            'models_with_custom_primary_key' => 0,
            'models_without_timestamps' => 0,
            'table_names' => []
        ];
        
        foreach ($models as $model) {
            $tableConfig = $model['table_config'];
            
            if ($tableConfig['table']) {
                $coverage['models_with_explicit_table']++;
                $coverage['table_names'][] = $tableConfig['table'];
            } else {
                // Inferir nome da tabela baseado no nome da classe
                $tableName = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $model['class_name'])) . 's';
                $coverage['table_names'][] = $tableName;
            }
            
            if ($tableConfig['primary_key'] !== 'id') {
                $coverage['models_with_custom_primary_key']++;
            }
            
            if (!$tableConfig['timestamps']) {
                $coverage['models_without_timestamps']++;
            }
        }
        
        return $coverage;
    }
}

// Execução do script
echo "🚀 Iniciando análise detalhada de models Laravel\n";
echo "📍 Diretório: " . base_path('app/Models') . "\n\n";

try {
    $extractor = new ModelExtractor();
    $extractedData = $extractor->extractAllModels();
    
    // Salvar dados extraídos
    $outputFile = base_path('docs/extraction/models-analysis.json');
    file_put_contents(
        $outputFile,
        json_encode($extractedData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
    
    echo "\n✅ Análise concluída com sucesso!\n";
    echo "📁 Arquivo gerado: docs/extraction/models-analysis.json\n";
    echo "📊 Total de models: " . $extractedData['total_models'] . "\n";
    echo "🔗 Total de relacionamentos: " . $extractedData['statistics']['total_relationships'] . "\n";
    
    $features = $extractedData['statistics']['features_usage'];
    echo "🎯 Features mais usadas:\n";
    arsort($features);
    foreach (array_slice($features, 0, 5, true) as $feature => $count) {
        echo "   - {$feature}: {$count} models\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erro durante análise: " . $e->getMessage() . "\n";
    echo "📍 Arquivo: " . $e->getFile() . "\n";
    echo "📍 Linha: " . $e->getLine() . "\n";
    exit(1);
}

echo "\n🎯 Próximo passo: Execute extract-all.php\n";