<?php

namespace App\Utils;

/**
 * Validador liviano de reglas comunes para payloads JSON entrantes.
 * Uso: Validator::make($data, ['email' => 'required|email', 'price' => 'required|numeric'])
 */
class Validator
{
    public static function make(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $ruleString) {
            $rulesArr = explode('|', $ruleString);
            $value = $data[$field] ?? null;

            foreach ($rulesArr as $rule) {
                [$ruleName, $param] = str_contains($rule, ':') ? explode(':', $rule, 2) : [$rule, null];

                switch ($ruleName) {
                    case 'required':
                        if ($value === null || $value === '') {
                            $errors[$field][] = "El campo {$field} es obligatorio.";
                        }
                        break;
                    case 'email':
                        if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            $errors[$field][] = "El campo {$field} debe ser un email válido.";
                        }
                        break;
                    case 'numeric':
                        if ($value !== null && $value !== '' && !is_numeric($value)) {
                            $errors[$field][] = "El campo {$field} debe ser numérico.";
                        }
                        break;
                    case 'min':
                        if ($value !== null && strlen((string)$value) < (int)$param) {
                            $errors[$field][] = "El campo {$field} debe tener al menos {$param} caracteres.";
                        }
                        break;
                    case 'in':
                        $allowed = explode(',', $param);
                        if ($value !== null && !in_array($value, $allowed, true)) {
                            $errors[$field][] = "El campo {$field} debe ser uno de: {$param}.";
                        }
                        break;
                }
            }
        }

        return $errors;
    }
}
