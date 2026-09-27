<?php

declare(strict_types=1);

$finder = new PhpCsFixer\Finder()
    ->in([__DIR__.'/src', __DIR__.'/tests', __DIR__.'/migrations'])
;

return new PhpCsFixer\Config()
    ->setRules([
        '@Symfony' => true,
        '@PHP8x4Migration' => true,
        'declare_strict_types' => true,
        'strict_comparison' => true,
        'native_function_invocation' => ['include' => ['@compiler_optimized'], 'scope' => 'namespaced'],
        'php_unit_test_case_static_method_calls' => ['call_type' => 'self'],
    ])
    ->setRiskyAllowed(true)
    ->setFinder($finder)
    ->setCacheFile(__DIR__.'/var/.php-cs-fixer.cache')
;
